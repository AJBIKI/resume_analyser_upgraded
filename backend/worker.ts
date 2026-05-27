import { Worker, Job } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { redisConnection } from '../app/lib/redis';
import { callOpenAIApi } from '../app/lib/openai-api';
import { getDb } from '../app/lib/mongodb';
import { generateEmbedding } from './lib/embeddings';
import { qdrantClient, COLLECTION_NAME } from './lib/qdrant';
import { io } from './index';
import { 
  JD_INTEL_SYSTEM_PROMPT, JD_INTEL_USER_PROMPT, 
  RESUME_MAP_SYSTEM_PROMPT, RESUME_MAP_USER_PROMPT,
  MASTER_ANALYSIS_SYSTEM_PROMPT, MASTER_ANALYSIS_USER_PROMPT 
} from './lib/prompts';

interface AnalyzeJobData {
  resumeText: string;
  jobDescription: string;
  clerkUserId: string;
  resumeFilename: string;
  atsIssues: string[]; // (Legacy, now handled by Stage 3)
}

function cleanText(text: string): string {
  let cleaned = text;
  // Replace Unicode ligatures
  cleaned = cleaned.replace(/ﬁ/g, 'fi').replace(/ﬂ/g, 'fl').replace(/ﬀ/g, 'ff');
  // Strip soft hyphens
  cleaned = cleaned.replace(/\u00AD/g, '');
  // Normalize bullets
  cleaned = cleaned.replace(/[•▪◦–*]/g, '-');
  // Normalize whitespace (tabs to spaces)
  cleaned = cleaned.replace(/\t/g, ' ');
  // Collapse >2 newlines to 2 newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
}

export const worker = new Worker<AnalyzeJobData>(
  'analyze-resume',
  async (job: Job) => {
    console.log(`[Worker] Started processing job: ${job.id}`);
    
    const {
      resumeText,
      jobDescription,
      clerkUserId,
      resumeFilename,
    } = job.data;
    
    // ==========================================
    // STAGE 1: Full Text Extraction & Cleaning
    // ==========================================
    io.to(job.id!).emit('progress', { step: 'Stage 1/6: Cleaning document text...', percent: 10 });
    const cleanedResume = cleanText(resumeText);

    // ==========================================
    // STAGE 2: JD Intelligence Extraction
    // ==========================================
    io.to(job.id!).emit('progress', { step: 'Stage 2/6: Extracting Job Description intelligence...', percent: 25 });
    
    const db = await getDb();
    const jdHash = crypto.createHash('sha256').update(jobDescription.toLowerCase().trim()).digest('hex');
    let jdIntel;
    
    const cachedIntel = await db.collection('jd_intelligence').findOne({ jdHash });
    if (cachedIntel) {
      console.log(`[Worker] Using cached JD Intelligence for hash ${jdHash}`);
      jdIntel = cachedIntel.data;
    } else {
      const jdPrompt = JD_INTEL_USER_PROMPT.replace('{{JD_TEXT}}', jobDescription);
      const { response, error } = await callOpenAIApi(jdPrompt, { systemPrompt: JD_INTEL_SYSTEM_PROMPT });
      if (error) throw new Error("JD Intelligence Extraction failed: " + error);
      jdIntel = JSON.parse(response);
      await db.collection('jd_intelligence').insertOne({ jdHash, data: jdIntel, createdAt: new Date() });
    }

    // ==========================================
    // STAGE 3: Resume Section Map & Facts
    // ==========================================
    io.to(job.id!).emit('progress', { step: 'Stage 3/6: Mapping resume sections...', percent: 40 });
    
    const mapPrompt = RESUME_MAP_USER_PROMPT.replace('{{CLEANED_RESUME_TEXT}}', cleanedResume);
    const mapRes = await callOpenAIApi(mapPrompt, { systemPrompt: RESUME_MAP_SYSTEM_PROMPT });
    if (mapRes.error) throw new Error("Resume Mapping failed: " + mapRes.error);
    const resumeMap = JSON.parse(mapRes.response);

    // ==========================================
    // STAGE 4: Section-Aware Chunking
    // ==========================================
    io.to(job.id!).emit('progress', { step: 'Stage 4/6: Chunking text semantically...', percent: 55 });
    
    const lines = cleanedResume.split('\n');
    const sections: {name: string, text: string}[] = [];
    let currentSectionName = 'summary'; // default
    let currentBlock: string[] = [];

    // Extract raw headers from Stage 3 output
    const rawHeaders: {key: string, normalized: string}[] = [];
    if (resumeMap.sections) {
      for (const [key, val] of Object.entries(resumeMap.sections)) {
        const sectionData = val as any;
        if (sectionData.present && sectionData.detectedHeaderRawText) {
          rawHeaders.push({
            key,
            normalized: sectionData.detectedHeaderRawText.toLowerCase().replace(/\s+/g, ' ').trim()
          });
        }
      }
    }

    for (const line of lines) {
      const normLine = line.toLowerCase().replace(/\s+/g, ' ').trim();
      const isShort = normLine.split(' ').length < 6;
      const isBullet = normLine.startsWith('-');
      
      let matchedHeader = null;
      if (isShort && !isBullet && normLine.length > 0) {
        matchedHeader = rawHeaders.find(h => h.normalized === normLine);
      }

      if (matchedHeader) {
        if (currentBlock.length > 0) {
          sections.push({ name: currentSectionName, text: currentBlock.join('\n') });
          currentBlock = [];
        }
        currentSectionName = matchedHeader.key;
      } else {
        currentBlock.push(line);
      }
    }
    if (currentBlock.length > 0) {
      sections.push({ name: currentSectionName, text: currentBlock.join('\n') });
    }

    const chunks: {section: string, text: string}[] = [];
    for (const sec of sections) {
      // Split into sentences (simple regex ending in punctuation followed by space and Capital)
      const sentences = sec.text.match(/[^.!?]+[.!?]+(?=\s+[A-Z]|$)|[^.!?]+$/g) || [sec.text];
      let currentChunk = '';
      for (const sentence of sentences) {
        if ((currentChunk + sentence).length > 800) { // approx 150-200 tokens
          if (currentChunk.trim().length > 20) {
            chunks.push({ section: sec.name, text: currentChunk.trim() });
          }
          currentChunk = sentence;
        } else {
          currentChunk += ' ' + sentence;
        }
      }
      if (currentChunk.trim().length > 20) {
        chunks.push({ section: sec.name, text: currentChunk.trim() });
      }
    }

    // ==========================================
    // STAGE 5: Semantic Vector Scoring
    // ==========================================
    io.to(job.id!).emit('progress', { step: 'Stage 5/6: Vector similarity scoring...', percent: 70 });
    
    let semanticScore = 0;
    const semanticGaps: any[] = [];
    
    try {
      const jdEmbedding = await generateEmbedding(jobDescription.slice(0, 8000));
      const points = [];
      
      for (const chunk of chunks) {
        // Prepend metadata!
        const prefix = `[${chunk.section.toUpperCase()}] `;
        const embedding = await generateEmbedding(prefix + chunk.text);
        points.push({
          id: uuidv4(),
          vector: embedding,
          payload: { jobId: job.id, clerkUserId, text: chunk.text, section: chunk.section }
        });
      }

      if (points.length > 0) {
        await qdrantClient.upsert(COLLECTION_NAME, { wait: true, points });

        const searchResult = await qdrantClient.search(COLLECTION_NAME, {
          vector: jdEmbedding,
          limit: 20, // Fetch up to 20 to get average coverage
          filter: { must: [{ key: "jobId", match: { value: job.id } }] }
        });

        // Calculate weighted semantic score
        const sectionWeights: Record<string, number> = {
          experience: 2.0, skills: 1.8, projects: 1.5, education: 1.0, summary: 0.7
        };

        let totalWeightedScore = 0;
        let totalWeight = 0;
        const sectionScores: Record<string, { sum: number, count: number }> = {};

        for (const hit of searchResult) {
          const sec = hit.payload?.section as string || 'unknown';
          const weight = sectionWeights[sec] || 0.5;
          totalWeightedScore += hit.score * weight;
          totalWeight += weight;
          
          if (!sectionScores[sec]) sectionScores[sec] = { sum: 0, count: 0 };
          sectionScores[sec].sum += hit.score;
          sectionScores[sec].count++;
        }

        if (totalWeight > 0) {
          semanticScore = Math.round((totalWeightedScore / totalWeight) * 100);
          if (semanticScore > 100) semanticScore = 100;
        }

        // Detect Gaps
        for (const [sec, data] of Object.entries(sectionScores)) {
          const avg = (data.sum / data.count) * 100;
          if ((sec === 'experience' && avg < 65) || (sec === 'skills' && avg < 60)) {
            semanticGaps.push({ section: sec, score: Math.round(avg) });
          }
        }
      }
    } catch (err) {
      console.error(`[Worker] Semantic search failed for job ${job.id}:`, err);
    }

    // ==========================================
    // STAGE 6: Master LLM Analysis
    // ==========================================
    io.to(job.id!).emit('progress', { step: 'Stage 6/6: Generating master analysis...', percent: 85 });
    
    // Construct final dynamic prompt
    const masterPrompt = MASTER_ANALYSIS_USER_PROMPT
      .replace('{{CLEANED_RESUME_TEXT}}', cleanedResume)
      .replace('{{JD_TEXT}}', jobDescription)
      .replace('{{JD_INTEL_JSON}}', JSON.stringify(jdIntel))
      .replace('{{RESUME_FACTS_JSON}}', JSON.stringify(resumeMap))
      .replace('{{SEMANTIC_GAPS_JSON}}', JSON.stringify(semanticGaps))
      .replace('{{W_SKILLS}}', jdIntel.rubricWeights?.technicalSkills?.toString() || "35")
      .replace('{{W_YOE}}', jdIntel.rubricWeights?.yearsOfExperience?.toString() || "20")
      .replace('{{W_EDU}}', jdIntel.rubricWeights?.education?.toString() || "10")
      .replace('{{W_KEYWORDS}}', jdIntel.rubricWeights?.keywordCoverage?.toString() || "20")
      .replace('{{W_SOFT}}', jdIntel.rubricWeights?.softSkillsAndLeadership?.toString() || "15");

    const masterRes = await callOpenAIApi(masterPrompt, { systemPrompt: MASTER_ANALYSIS_SYSTEM_PROMPT });
    if (masterRes.error) throw new Error("Master Analysis failed: " + masterRes.error);
    
    let finalAnalysis;
    try {
      finalAnalysis = JSON.parse(masterRes.response);
      if (finalAnalysis.overallScore > 100) finalAnalysis.overallScore = 100;
    } catch (e) {
      throw new Error("Failed to parse Master Analysis JSON");
    }

    // Merge everything together
    const analysisResult = {
      ...finalAnalysis,
      semanticScore,
      semanticGaps,
      jdIntel,
      resumeFacts: resumeMap.extractedFacts,
      atsWarnings: resumeMap.atsWarnings,
    };

    io.to(job.id!).emit('progress', { step: 'Saving results...', percent: 95 });

    // Save to MongoDB
    let analysisId: string | null = null;
    try {
      const db = await getDb();
      const doc = {
        clerkUserId,
        resumeFilename,
        resumeText: cleanedResume,
        jobDescription,
        ...analysisResult,
        createdAt: new Date(),
      };
      const result = await db.collection('analyses').insertOne(doc);
      analysisId = result.insertedId.toString();
      console.log(`[Worker] Analysis saved to database: ${analysisId}`);
    } catch (dbError) {
      console.error(`[Worker] Failed to save analysis:`, dbError);
    }

    io.to(job.id!).emit('completed', { analysisId, analysisResult });
    console.log(`[Worker] Finished processing job: ${job.id}`);
    return { analysisId, ...analysisResult };
  },
  {
    connection: redisConnection,
  }
);

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed with error:`, err);
  if (job?.id) {
    io.to(job.id).emit('error', { message: 'Analysis failed on the server. Please try again.' });
  }
});

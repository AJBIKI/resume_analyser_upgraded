"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.worker = void 0;
const bullmq_1 = require("bullmq");
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
const redis_1 = require("../app/lib/redis");
const openai_api_1 = require("../app/lib/openai-api");
const mongodb_1 = require("../app/lib/mongodb");
const embeddings_1 = require("./lib/embeddings");
const qdrant_1 = require("./lib/qdrant");
const index_1 = require("./index");
const prompts_1 = require("./lib/prompts");
function cleanText(text) {
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
exports.worker = new bullmq_1.Worker('analyze-resume', async (job) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    console.log(`[Worker] Started processing job: ${job.id}`);
    const { resumeText, jobDescription, clerkUserId, resumeFilename, } = job.data;
    // ==========================================
    // STAGE 1: Full Text Extraction & Cleaning
    // ==========================================
    index_1.io.to(job.id).emit('progress', { step: 'Stage 1/6: Cleaning document text...', percent: 10 });
    const cleanedResume = cleanText(resumeText);
    // ==========================================
    // STAGE 2: JD Intelligence Extraction
    // ==========================================
    index_1.io.to(job.id).emit('progress', { step: 'Stage 2/6: Extracting Job Description intelligence...', percent: 25 });
    const db = await (0, mongodb_1.getDb)();
    const jdHash = crypto_1.default.createHash('sha256').update(jobDescription.toLowerCase().trim()).digest('hex');
    let jdIntel;
    const cachedIntel = await db.collection('jd_intelligence').findOne({ jdHash });
    if (cachedIntel) {
        console.log(`[Worker] Using cached JD Intelligence for hash ${jdHash}`);
        jdIntel = cachedIntel.data;
    }
    else {
        const jdPrompt = prompts_1.JD_INTEL_USER_PROMPT.replace('{{JD_TEXT}}', jobDescription);
        const { response, error } = await (0, openai_api_1.callOpenAIApi)(jdPrompt, { systemPrompt: prompts_1.JD_INTEL_SYSTEM_PROMPT });
        if (error)
            throw new Error("JD Intelligence Extraction failed: " + error);
        jdIntel = JSON.parse(response);
        await db.collection('jd_intelligence').insertOne({ jdHash, data: jdIntel, createdAt: new Date() });
    }
    // ==========================================
    // STAGE 3: Resume Section Map & Facts
    // ==========================================
    index_1.io.to(job.id).emit('progress', { step: 'Stage 3/6: Mapping resume sections...', percent: 40 });
    const mapPrompt = prompts_1.RESUME_MAP_USER_PROMPT.replace('{{CLEANED_RESUME_TEXT}}', cleanedResume);
    const mapRes = await (0, openai_api_1.callOpenAIApi)(mapPrompt, { systemPrompt: prompts_1.RESUME_MAP_SYSTEM_PROMPT });
    if (mapRes.error)
        throw new Error("Resume Mapping failed: " + mapRes.error);
    const resumeMap = JSON.parse(mapRes.response);
    // ==========================================
    // STAGE 4: Section-Aware Chunking
    // ==========================================
    index_1.io.to(job.id).emit('progress', { step: 'Stage 4/6: Chunking text semantically...', percent: 55 });
    const lines = cleanedResume.split('\n');
    const sections = [];
    let currentSectionName = 'summary'; // default
    let currentBlock = [];
    // Extract raw headers from Stage 3 output
    const rawHeaders = [];
    if (resumeMap.sections) {
        for (const [key, val] of Object.entries(resumeMap.sections)) {
            const sectionData = val;
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
        }
        else {
            currentBlock.push(line);
        }
    }
    if (currentBlock.length > 0) {
        sections.push({ name: currentSectionName, text: currentBlock.join('\n') });
    }
    const chunks = [];
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
            }
            else {
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
    index_1.io.to(job.id).emit('progress', { step: 'Stage 5/6: Vector similarity scoring...', percent: 70 });
    let semanticScore = 0;
    const semanticGaps = [];
    try {
        const jdEmbedding = await (0, embeddings_1.generateEmbedding)(jobDescription.slice(0, 8000));
        const points = [];
        for (const chunk of chunks) {
            // Prepend metadata!
            const prefix = `[${chunk.section.toUpperCase()}] `;
            const embedding = await (0, embeddings_1.generateEmbedding)(prefix + chunk.text);
            points.push({
                id: (0, uuid_1.v4)(),
                vector: embedding,
                payload: { jobId: job.id, clerkUserId, text: chunk.text, section: chunk.section }
            });
        }
        if (points.length > 0) {
            await qdrant_1.qdrantClient.upsert(qdrant_1.COLLECTION_NAME, { wait: true, points });
            const searchResult = await qdrant_1.qdrantClient.search(qdrant_1.COLLECTION_NAME, {
                vector: jdEmbedding,
                limit: 20, // Fetch up to 20 to get average coverage
                filter: { must: [{ key: "jobId", match: { value: job.id } }] }
            });
            // Calculate weighted semantic score
            const sectionWeights = {
                experience: 2.0, skills: 1.8, projects: 1.5, education: 1.0, summary: 0.7
            };
            let totalWeightedScore = 0;
            let totalWeight = 0;
            const sectionScores = {};
            for (const hit of searchResult) {
                const sec = ((_a = hit.payload) === null || _a === void 0 ? void 0 : _a.section) || 'unknown';
                const weight = sectionWeights[sec] || 0.5;
                totalWeightedScore += hit.score * weight;
                totalWeight += weight;
                if (!sectionScores[sec])
                    sectionScores[sec] = { sum: 0, count: 0 };
                sectionScores[sec].sum += hit.score;
                sectionScores[sec].count++;
            }
            if (totalWeight > 0) {
                semanticScore = Math.round((totalWeightedScore / totalWeight) * 100);
                if (semanticScore > 100)
                    semanticScore = 100;
            }
            // Detect Gaps
            for (const [sec, data] of Object.entries(sectionScores)) {
                const avg = (data.sum / data.count) * 100;
                if ((sec === 'experience' && avg < 65) || (sec === 'skills' && avg < 60)) {
                    semanticGaps.push({ section: sec, score: Math.round(avg) });
                }
            }
        }
    }
    catch (err) {
        console.error(`[Worker] Semantic search failed for job ${job.id}:`, err);
    }
    // ==========================================
    // STAGE 6: Master LLM Analysis
    // ==========================================
    index_1.io.to(job.id).emit('progress', { step: 'Stage 6/6: Generating master analysis...', percent: 85 });
    // Construct final dynamic prompt
    const masterPrompt = prompts_1.MASTER_ANALYSIS_USER_PROMPT
        .replace('{{CLEANED_RESUME_TEXT}}', cleanedResume)
        .replace('{{JD_TEXT}}', jobDescription)
        .replace('{{JD_INTEL_JSON}}', JSON.stringify(jdIntel))
        .replace('{{RESUME_FACTS_JSON}}', JSON.stringify(resumeMap))
        .replace('{{SEMANTIC_GAPS_JSON}}', JSON.stringify(semanticGaps))
        .replace('{{W_SKILLS}}', ((_c = (_b = jdIntel.rubricWeights) === null || _b === void 0 ? void 0 : _b.technicalSkills) === null || _c === void 0 ? void 0 : _c.toString()) || "35")
        .replace('{{W_YOE}}', ((_e = (_d = jdIntel.rubricWeights) === null || _d === void 0 ? void 0 : _d.yearsOfExperience) === null || _e === void 0 ? void 0 : _e.toString()) || "20")
        .replace('{{W_EDU}}', ((_g = (_f = jdIntel.rubricWeights) === null || _f === void 0 ? void 0 : _f.education) === null || _g === void 0 ? void 0 : _g.toString()) || "10")
        .replace('{{W_KEYWORDS}}', ((_j = (_h = jdIntel.rubricWeights) === null || _h === void 0 ? void 0 : _h.keywordCoverage) === null || _j === void 0 ? void 0 : _j.toString()) || "20")
        .replace('{{W_SOFT}}', ((_l = (_k = jdIntel.rubricWeights) === null || _k === void 0 ? void 0 : _k.softSkillsAndLeadership) === null || _l === void 0 ? void 0 : _l.toString()) || "15");
    const masterRes = await (0, openai_api_1.callOpenAIApi)(masterPrompt, { systemPrompt: prompts_1.MASTER_ANALYSIS_SYSTEM_PROMPT });
    if (masterRes.error)
        throw new Error("Master Analysis failed: " + masterRes.error);
    let finalAnalysis;
    try {
        finalAnalysis = JSON.parse(masterRes.response);
        if (finalAnalysis.overallScore > 100)
            finalAnalysis.overallScore = 100;
    }
    catch (e) {
        throw new Error("Failed to parse Master Analysis JSON");
    }
    // Merge everything together
    const analysisResult = Object.assign(Object.assign({}, finalAnalysis), { semanticScore,
        semanticGaps,
        jdIntel, resumeFacts: resumeMap.extractedFacts, atsWarnings: resumeMap.atsWarnings });
    index_1.io.to(job.id).emit('progress', { step: 'Saving results...', percent: 95 });
    // Save to MongoDB
    let analysisId = null;
    try {
        const db = await (0, mongodb_1.getDb)();
        const doc = Object.assign(Object.assign({ clerkUserId,
            resumeFilename, resumeText: cleanedResume, jobDescription }, analysisResult), { createdAt: new Date() });
        const result = await db.collection('analyses').insertOne(doc);
        analysisId = result.insertedId.toString();
        console.log(`[Worker] Analysis saved to database: ${analysisId}`);
    }
    catch (dbError) {
        console.error(`[Worker] Failed to save analysis:`, dbError);
    }
    index_1.io.to(job.id).emit('completed', { analysisId, analysisResult });
    console.log(`[Worker] Finished processing job: ${job.id}`);
    return Object.assign({ analysisId }, analysisResult);
}, {
    connection: redis_1.redisConnection,
});
exports.worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job === null || job === void 0 ? void 0 : job.id} failed with error:`, err);
    if (job === null || job === void 0 ? void 0 : job.id) {
        index_1.io.to(job.id).emit('error', { message: 'Analysis failed on the server. Please try again.' });
    }
});

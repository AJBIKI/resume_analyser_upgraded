export const JD_INTEL_SYSTEM_PROMPT = `You are a job description analyst. Extract structured intelligence from a job description
to drive a resume scoring rubric. Be precise and conservative — only mark a skill as
"mustHave" if the JD explicitly states it as required, not just preferred.

Return ONLY valid JSON matching the schema. No preamble, no explanation.`;

export const JD_INTEL_USER_PROMPT = `Analyze this job description and return the following JSON:

{
  "roleTitle": string,
  "seniorityLevel": "intern" | "junior" | "mid" | "senior" | "lead" | "executive",
  "seniorityConfidence": "high" | "medium" | "low",
  "senioritySignals": [string],         // phrases that indicated seniority e.g. "3-5 years required"
  "yoeMin": number | null,              // minimum years of experience required (null if not stated)
  "yoeMax": number | null,
  "yoeExplicit": boolean,               // true if JD literally states a year range
  "mustHaveSkills": [string],           // skills explicitly required
  "niceToHaveSkills": [string],         // skills listed as preferred/bonus/plus
  "educationRequired": "none" | "any" | "bachelors" | "masters" | "phd",
  "educationFlexible": boolean,         // true if JD says "or equivalent experience"
  "industryDomain": string,             // e.g. "fintech", "healthtech", "enterprise SaaS"
  "softSkillsRequired": [string],       // e.g. ["communication", "cross-functional collaboration"]
  "leadershipRequired": boolean,
  "leadershipSignals": [string],        // phrases like "manage a team", "mentor juniors"
  "remotePolicy": "remote" | "hybrid" | "onsite" | "unspecified",
  "rubricWeights": {
    "technicalSkills": number,          // must sum to 100
    "yearsOfExperience": number,
    "education": number,
    "keywordCoverage": number,
    "softSkillsAndLeadership": number
  },
  "rubricRationale": string             // 1-sentence explanation of why weights were chosen
}

Rubric weight rules you MUST follow:
- intern/junior: technicalSkills 50, yearsOfExperience 5, education 10, keywordCoverage 25, softSkillsAndLeadership 10
- mid: technicalSkills 40, yearsOfExperience 20, education 10, keywordCoverage 20, softSkillsAndLeadership 10
- senior: technicalSkills 35, yearsOfExperience 25, education 10, keywordCoverage 15, softSkillsAndLeadership 15
- lead: technicalSkills 30, yearsOfExperience 20, education 5, keywordCoverage 15, softSkillsAndLeadership 30
- executive: technicalSkills 15, yearsOfExperience 15, education 5, keywordCoverage 10, softSkillsAndLeadership 55
- If seniorityLevel is ambiguous, default to "mid" weights.

---
JOB DESCRIPTION:
{{JD_TEXT}}`;

export const RESUME_MAP_SYSTEM_PROMPT = `You are a resume parser. Your job is to identify the structural sections of a resume and
extract structured facts from each. You must handle all common section name variations —
"Work History", "Professional Experience", "Career Summary" are all valid names for
standard ATS sections.

Do NOT infer or guess information not present. If a field is absent, return null or [].
Return ONLY valid JSON. No preamble, no markdown, no explanation.`;

export const RESUME_MAP_USER_PROMPT = `Parse this resume and return the following JSON:

{
  "sections": {
    "contactInfo":     { "present": boolean, "detectedHeaderName": string | null, "detectedHeaderRawText": string | null, "hasEmail": boolean, "hasPhone": boolean, "hasLinkedIn": boolean, "hasLocation": boolean },
    "summary":         { "present": boolean, "detectedHeaderName": string | null, "detectedHeaderRawText": string | null },
    "experience":      { "present": boolean, "detectedHeaderName": string | null, "detectedHeaderRawText": string | null },
    "education":       { "present": boolean, "detectedHeaderName": string | null, "detectedHeaderRawText": string | null },
    "skills":          { "present": boolean, "detectedHeaderName": string | null, "detectedHeaderRawText": string | null },
    "projects":        { "present": boolean, "detectedHeaderName": string | null, "detectedHeaderRawText": string | null },
    "certifications":  { "present": boolean, "detectedHeaderName": string | null, "detectedHeaderRawText": string | null },
    "achievements":    { "present": boolean, "detectedHeaderName": string | null, "detectedHeaderRawText": string | null }
  },
  "extractedFacts": {
    "fullName": string | null,
    "totalYoe": number | null,              // summed from all experience date ranges
    "yoeCalculationNote": string | null,    // e.g. "3 roles: 2019-2021, 2021-2023, 2023-present"
    "highestEducation": "highschool" | "bachelors" | "masters" | "phd" | "unspecified",
    "educationField": string | null,        // e.g. "Computer Science"
    "allSkillsMentioned": [string],         // every technical skill found anywhere in resume
    "programmingLanguages": [string],
    "frameworks": [string],
    "tools": [string],
    "softSkillsMentioned": [string],
    "companiesWorkedAt": [string],
    "currentOrMostRecentTitle": string | null,
    "senioritySignal": "intern" | "junior" | "mid" | "senior" | "lead" | "executive",
    "hasQuantifiedAchievements": boolean,   // true if any bullet has numbers/percentages/metrics
    "quantifiedAchievementCount": number,
    "avgBulletLength": "short" | "medium" | "long",  // short <8 words, long >20 words
    "usesFirstPerson": boolean,             // true if resume uses "I", "my", "me"
    "tenseConsistency": "consistent" | "mixed" | "unknown"
  },
  "atsWarnings": [
    {
      "type": "missingSectionRequired" | "missingSectionRecommended" | "formattingIssue" | "contentIssue",
      "message": string,
      "severity": "critical" | "warning" | "info"
    }
  ]
}

---
RESUME TEXT:
{{CLEANED_RESUME_TEXT}}`;

export const MASTER_ANALYSIS_SYSTEM_PROMPT = `You are an expert resume analyst and career coach with deep knowledge of ATS systems,
hiring processes, and resume best practices across industries.

You will receive:
1. A cleaned resume text
2. A job description
3. Pre-extracted JD intelligence (seniority, required skills, dynamic rubric weights)
4. Pre-extracted resume facts (YoE, skills, section map)
5. Semantic similarity gaps (sections where resume meaning doesn't match JD)

Your job is to produce a comprehensive, actionable analysis. Be specific — generic advice
like "add more skills" is useless. Reference actual content from the resume and JD.

CRITICAL RULES:
- Use the provided rubricWeights EXACTLY. Do not use a hardcoded rubric.
- Score each rubric category independently, then compute the weighted total.
- If yoeExplicit is false in JD intel, do not heavily penalise the candidate for YoE.
- Detect seniority mismatch: if resume senioritySignal != JD seniorityLevel, flag it.
- All bullet rewrites must start with a strong action verb and include a metric where possible.
- Return ONLY valid JSON. No preamble, no markdown fences.`;

export const MASTER_ANALYSIS_USER_PROMPT = `Produce a full resume analysis using the inputs below.

Return this exact JSON schema:

{
  "overallScore": number,                 // 0-100, weighted sum of rubric scores
  "scoreInterpretation": "strong" | "moderate" | "weak",
  "rubricBreakdown": {
    "technicalSkills":        { "score": number, "maxScore": number, "rationale": string },
    "yearsOfExperience":      { "score": number, "maxScore": number, "rationale": string },
    "education":              { "score": number, "maxScore": number, "rationale": string },
    "keywordCoverage":        { "score": number, "maxScore": number, "rationale": string },
    "softSkillsAndLeadership":{ "score": number, "maxScore": number, "rationale": string }
  },
  "seniorityMismatch": {
    "detected": boolean,
    "resumeLevel": string,
    "jdLevel": string,
    "message": string | null
  },
  "keywordAnalysis": {
    "matchedMustHave":    [string],        // must-have JD skills found in resume
    "missingMustHave":    [string],        // must-have JD skills NOT found
    "matchedNiceToHave":  [string],
    "missingNiceToHave":  [string],
    "unexpectedStrengths":[string]         // strong skills in resume not in JD — candidate should highlight these if relevant
  },
  "atsAnalysis": {
    "overallAtsScore": number,             // 0-100
    "sectionFlags": [
      { "section": string, "status": "present" | "missing" | "weak", "severity": "critical"|"warning"|"info", "advice": string }
    ],
    "formattingFlags": [string]            // e.g. "Uses tables — may break ATS parsers"
  },
  "bulletFeedback": [
    {
      "original": string,                  // exact bullet from resume
      "issue": string,                     // what's wrong: weak verb, no metric, too long, etc.
      "rewritten": string,                 // improved version
      "improvementType": "actionVerb" | "addMetric" | "clarity" | "relevance"
    }
  ],
  "grammarAndStyle": {
    "issues": [
      { "text": string, "issue": string, "suggestion": string }
    ],
    "toneAssessment": string,
    "readabilityGrade": number,
    "usesFirstPerson": boolean,
    "tenseConsistency": string
  },
  "semanticInsights": {
    "strongestSections": [string],         // section names where semantic score was highest
    "weakestSections":   [string],         // section names where semantic score was lowest
    "meaningGaps": [
      { "area": string, "gap": string, "suggestion": string }
    ]
  },
  "topPriorityActions": [                  // max 5, ordered by impact
    { "priority": number, "action": string, "impact": "high"|"medium"|"low", "effort": "high"|"medium"|"low" }
  ],
  "summaryVerdict": string                 // 2-3 sentence honest assessment for the candidate
}

---
RESUME TEXT (FULL):
{{CLEANED_RESUME_TEXT}}

---
JOB DESCRIPTION:
{{JD_TEXT}}

---
JD INTELLIGENCE (from prior analysis):
{{JD_INTEL_JSON}}

---
RESUME FACTS (from prior parsing):
{{RESUME_FACTS_JSON}}

---
SEMANTIC GAPS (sections with low vector similarity):
{{SEMANTIC_GAPS_JSON}}

---
RUBRIC WEIGHTS TO USE:
technicalSkills: {{W_SKILLS}}, yearsOfExperience: {{W_YOE}}, 
education: {{W_EDU}}, keywordCoverage: {{W_KEYWORDS}}, 
softSkillsAndLeadership: {{W_SOFT}}`;

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { apiError } from '@educompass/shared';
import { supabaseAdmin } from '../lib/supabase';
import { generateChatResponse, LLM_CONFIG } from '../lib/llm-gateway';

export const chatRouter = Router();

// ─── Input Validation ─────────────────────────────────────────────────────────

const ChatMessageSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(300, 'Message cannot exceed 300 characters'),
  preferOffline: z.boolean().optional().default(false),
});

// ─── Static Verified NED Academic Fallbacks (Layer 1 offline cache) ────────────

interface PreloadedItem {
  patterns: string[];
  answer: string;
  category: string;
}

const STATIC_PRELOADED_ANSWERS: PreloadedItem[] = [
  {
    patterns: ['hi', 'hello', 'hey', 'salam', 'assalam', 'aoa', 'greetings', 'help', 'who are you', 'what can you do', 'good morning', 'good afternoon', 'good evening'],
    answer: 'Hello! I am the EduCompass Academic Assistant for NED University Computer & Information Systems Engineering. You can ask me about degree requirements, course prerequisites, grading scales, FYP rules & archive, faculty research domains, and career roadmaps.',
    category: 'general',
  },
  {
    patterns: ['fyp', 'final year project', 'start fyp', 'when fyp', 'eligibility fyp'],
    answer: 'At NED University, the Final Year Project (FYP) officially commences in the 7th semester. Students must clear core computing prerequisites (Data Structures & Database Systems) and form teams of 3–4 members before submitting project proposals to the departmental FYP committee.',
    category: 'fyp',
  },
  {
    patterns: ['passing grade', 'minimum grade', 'grading system', 'grade scale'],
    answer: 'The minimum passing grade at NED University is D (1.0 grade point). The scale runs from A (4.0), A- (3.7), B+ (3.4), B (3.0), B- (2.7), C+ (2.4), C (2.0), C- (1.7), D+ (1.4), D (1.0) to F (0.0).',
    category: 'academics',
  },
  {
    patterns: ['cgpa', 'graduation cgpa', 'minimum cgpa', 'good standing'],
    answer: 'To graduate with a Bachelor of Science or Engineering degree from NED University, a student must secure a minimum Cumulative GPA (CGPA) of 2.0. Maintaining a CGPA of 3.0 or higher is required for Dean’s Honor List and merit scholarships.',
    category: 'academics',
  },
  {
    patterns: ['prerequisite', 'fail course', 'backlog', 'repeat course'],
    answer: 'Under NED academic regulations, if you fail a prerequisite course, you cannot enroll in subsequent dependent courses until the prerequisite is cleared. In retakes, the highest grade achieved is typically counted toward your CGPA calculation.',
    category: 'prerequisites',
  },
  {
    patterns: ['degree plan', 'planner', 'course schedule', 'how to plan courses', 'semester plan'],
    answer: 'You can use the Degree Planner tab in EduCompass to build your 8-semester schedule. It automatically validates prerequisite chains and flags credit overload before you submit your plan.',
    category: 'academics',
  },
  {
    patterns: ['max credit', 'credit hours', 'semester credits', 'overload'],
    answer: 'The standard maximum course load at NED CISE is 18 credit hours per regular semester. Students on good academic standing wishing to overload up to 21 credits must seek written approval from the Department Chairperson / Dean.',
    category: 'academics',
  },
  {
    patterns: ['professor', 'supervisor', 'contact faculty', 'outreach'],
    answer: 'You can explore faculty members and their verified research domains in the EduCompass Professor Directory. Outreach should be conducted professionally via official university email (mailto:) with your CV and project abstract.',
    category: 'professors',
  },
  {
    patterns: ['career', 'roadmap', 'tech career', 'job'],
    answer: 'EduCompass Career Hub offers 12 specialized technology roadmaps (AI/ML, Web Development, Cybersecurity, Cloud/DevOps, and more) aligned with NED CISE electives and industry certifications.',
    category: 'careers',
  },
];

// ─── Layer 1: Preloaded Answer Matcher ────────────────────────────────────────

async function matchLayer1Preloaded(query: string): Promise<string | null> {
  const normalizedQuery = query.toLowerCase().trim();
  const queryTokens = normalizedQuery.replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);

  // 1. Try DB chatbot_answers
  try {
    const { data: dbAnswers } = await supabaseAdmin
      .from('chatbot_answers')
      .select('question_pattern, answer_text, confidence_threshold');

    if (dbAnswers && dbAnswers.length > 0) {
      for (const item of dbAnswers) {
        const patterns = item.question_pattern.split(',').map((p: string) => p.trim().toLowerCase());
        const match = patterns.some((p: string) => {
          if (p.length <= 3) return queryTokens.includes(p) || normalizedQuery === p;
          return normalizedQuery.includes(p);
        });
        if (match) {
          return item.answer_text;
        }
      }
    }
  } catch {
    // Continue to static fallback
  }

  // 2. Static verified fallback
  for (const item of STATIC_PRELOADED_ANSWERS) {
    const match = item.patterns.some((p) => {
      if (p.length <= 3) return queryTokens.includes(p) || normalizedQuery === p;
      return normalizedQuery.includes(p);
    });
    if (match) {
      return item.answer;
    }
  }

  return null;
}

// ─── Layer 2: Knowledge Base & Course/FYP Retrieval ───────────────────────────

interface RetrievalSource {
  title: string;
  type: 'course' | 'fyp' | 'track' | 'kb' | 'professor';
  detail: string;
}

const STOP_WORDS = new Set([
  'what', 'how', 'when', 'where', 'which', 'who', 'why', 'can', 'could', 'would', 'should',
  'is', 'are', 'was', 'were', 'do', 'does', 'did', 'the', 'a', 'an', 'and', 'or', 'in', 'on',
  'at', 'to', 'for', 'of', 'with', 'by', 'about', 'tell', 'me', 'please', 'i', 'my', 'you',
  'your', 'we', 'our', 'need', 'want', 'know', 'give', 'any', 'some', 'there', 'have', 'has',
  'course', 'courses', 'subject', 'subjects'
]);

async function retrieveContext(query: string): Promise<{ contextText: string; sources: RetrievalSource[] }> {
  const allWords = query
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 2);

  const keywords = allWords.filter((w) => !STOP_WORDS.has(w) && w.length >= 3);
  const searchTerms = keywords.length > 0 ? keywords : allWords.filter((w) => w.length >= 3);

  const sources: RetrievalSource[] = [];
  const snippets: string[] = [];

  if (searchTerms.length === 0) {
    return { contextText: '', sources: [] };
  }

  try {
    for (const term of searchTerms.slice(0, 3)) {
      // 1. Search Courses
      const { data: courses } = await supabaseAdmin
        .from('courses')
        .select('code, title, credits, semester, category')
        .or(`title.ilike.%${term}%,code.ilike.%${term}%`)
        .limit(3);

      if (courses && courses.length > 0) {
        for (const c of courses) {
          if (!sources.some(s => s.title.includes(c.code))) {
            sources.push({
              title: `${c.code}: ${c.title}`,
              type: 'course',
              detail: `Semester ${c.semester}, ${c.credits} credit hours (${c.category})`,
            });
            snippets.push(`Course: ${c.code} - ${c.title} (${c.credits} Cr, Semester ${c.semester}, Category: ${c.category})`);
          }
        }
      }

      // 2. Search Published FYP Projects (Rule #2)
      const { data: fyps } = await supabaseAdmin
        .from('fyp_projects')
        .select('title, year, supervisor, domain_tags')
        .in('review_status', ['approved', 'published'])
        .or(`title.ilike.%${term}%,supervisor.ilike.%${term}%`)
        .limit(3);

      if (fyps && fyps.length > 0) {
        for (const f of fyps) {
          if (!sources.some(s => s.title === f.title)) {
            sources.push({
              title: f.title,
              type: 'fyp',
              detail: `Year ${f.year}, Supervisor: ${f.supervisor || 'N/A'}`,
            });
            snippets.push(`FYP Project: "${f.title}" (${f.year}, Supervisor: ${f.supervisor || 'Department Faculty'}, Domains: ${(f.domain_tags || []).join(', ')})`);
          }
        }
      }

      // 3. Search Professors
      const { data: profs } = await supabaseAdmin
        .from('professors')
        .select('name, title, rank, department, research_areas, domain_tags')
        .in('review_status', ['approved', 'published'])
        .or(`name.ilike.%${term}%,highlights.ilike.%${term}%`)
        .limit(3);

      if (profs && profs.length > 0) {
        for (const p of profs) {
          if (!sources.some(s => s.title === p.name)) {
            sources.push({
              title: p.name,
              type: 'professor',
              detail: `${p.title || ''} ${p.name} - ${(p.research_areas || []).slice(0, 3).join(', ')}`,
            });
            snippets.push(`Faculty: ${p.title || ''} ${p.name} (${p.department}). Research Areas: ${(p.research_areas || []).join(', ')}.`);
          }
        }
      }

      // 4. Search Career Tracks
      const { data: tracks } = await supabaseAdmin
        .from('career_tracks')
        .select('title, slug, description')
        .ilike('title', `%${term}%`)
        .limit(2);

      if (tracks && tracks.length > 0) {
        for (const t of tracks) {
          if (!sources.some(s => s.title === t.title)) {
            sources.push({
              title: t.title,
              type: 'track',
              detail: t.description || 'Career roadmap track',
            });
            snippets.push(`Career Track: ${t.title} - ${t.description || ''}`);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Chat-Route] Retrieval error:', err);
  }

  return {
    contextText: snippets.join('\n\n'),
    sources: sources.slice(0, 6),
  };
}

// ─── Layer 4: Record Unanswered Questions ─────────────────────────────────────

async function recordUnanswered(question: string): Promise<void> {
  try {
    await supabaseAdmin.from('chatbot_unanswered').insert({
      question,
      asked_at: new Date().toISOString(),
      resolved: false,
    });
  } catch (err) {
    console.warn('[Chat-Route] Error logging unanswered question:', err);
  }
}

// ─── Route: GET /api/v1/chat/suggestions ──────────────────────────────────────

chatRouter.get('/suggestions', (_req: Request, res: Response) => {
  res.json({
    data: [
      { text: 'What is the minimum CGPA required to graduate?', category: 'Academics' },
      { text: 'When does the Final Year Project start and what are the rules?', category: 'FYP' },
      { text: 'What happens if I fail a prerequisite course?', category: 'Prerequisites' },
      { text: 'What is the passing grade and grading scale at NED?', category: 'Grading' },
      { text: 'How do I contact a faculty member for project supervision?', category: 'Supervision' },
      { text: 'What is the maximum allowed credit hours per semester?', category: 'Regulations' },
    ],
  });
});

// ─── Route: POST /api/v1/chat ─────────────────────────────────────────────────

chatRouter.post('/', async (req: Request, res: Response) => {
  const parsed = ChatMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(apiError('VALIDATION_ERROR', parsed.error.errors[0]?.message || 'Invalid chat message', parsed.error.errors));
    return;
  }

  const { message, preferOffline } = parsed.data;
  const userId = req.user?.id || null;
  const disclaimer = 'Guidance estimates, not official university decisions.';

  // ─── LAYER 1: Preloaded Answers (Instant, 0 latency, 0 tokens) ──────────────
  const preloaded = await matchLayer1Preloaded(message);
  if (preloaded) {
    res.json({
      data: {
        answer: preloaded,
        layer: 1,
        source: 'preloaded_official',
        sources: [],
        disclaimer,
      },
    });
    return;
  }

  // ─── LAYER 2: Retrieval ─────────────────────────────────────────────────────
  const { contextText, sources } = await retrieveContext(message);

  // If user requested offline mode or LLM is explicitly disabled (Rule #5)
  if (preferOffline || LLM_CONFIG.provider === 'off' || !process.env.GEMINI_API_KEY) {
    if (sources.length > 0) {
      const summary = `Based on NED CISE departmental records, here are the matching resources:\n\n` +
        sources.map((s, idx) => `${idx + 1}. **${s.title}** (${s.type}): ${s.detail}`).join('\n');

      res.json({
        data: {
          answer: summary,
          layer: 2,
          source: 'retrieval_offline',
          sources,
          disclaimer,
        },
      });
      return;
    }

    // No retrieval match in offline mode -> Layer 4
    await recordUnanswered(message);
    res.json({
      data: {
        answer: 'I do not have that information based on the official NED CISE resources available. Please consult the CISE department or your academic advisor.',
        layer: 4,
        source: 'fallback',
        sources: [],
        disclaimer,
      },
    });
    return;
  }

  // ─── LAYER 3: LLM Generation ────────────────────────────────────────────────
  if (contextText.length > 0) {
    try {
      const llmResult = await generateChatResponse({
        userId,
        question: message,
        context: contextText,
      });

      res.json({
        data: {
          answer: llmResult.answer,
          layer: 3,
          source: `llm_${llmResult.provider}`,
          sources,
          disclaimer,
        },
      });
      return;
    } catch (err: unknown) {
      console.warn('[Chat-Route] LLM generation failed, falling back:', err);
      // Fallback: If retrieval context exists, return Layer 2 direct summary
      if (sources.length > 0) {
        res.json({
          data: {
            answer: `Here are the matching NED CISE department records:\n\n` +
              sources.map((s, idx) => `${idx + 1}. **${s.title}** (${s.type}): ${s.detail}`).join('\n'),
            layer: 2,
            source: 'retrieval_fallback',
            sources,
            disclaimer,
          },
        });
        return;
      }
    }
  }

  // ─── LAYER 4: Fallback (Rule #6) ────────────────────────────────────────────
  await recordUnanswered(message);
  res.json({
    data: {
      answer: 'I do not have that information based on the official NED CISE resources available. Please consult the CISE department or your academic advisor.',
      layer: 4,
      source: 'fallback',
      sources: [],
      disclaimer,
    },
  });
});

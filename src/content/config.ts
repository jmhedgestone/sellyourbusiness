import { defineCollection, z } from 'astro:content';

// "articles" — pillar pages + spoke articles (How to Sell a Business, Valuation, Confidential Sale)
const articles = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pillar: z.enum(['how-to-sell', 'valuation', 'confidential-sale', 'tech-valuation', 'pe-buyers', 'real-estate', 'quality-of-earnings']),
    spoke: z.string().optional(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('John Matsis'),
    draft: z.boolean().default(false),
    // AEO-critical: the 40-60 word answer LLMs will lift. Rendered as a schema.org Answer.
    answer: z.string().max(600),
    faqs: z
      .array(
        z.object({
          question: z.string(),
          answer: z.string(),
        })
      )
      .optional(),
    relatedArticles: z.array(z.string()).optional(),
    ogImage: z.string().optional(),
  }),
});

// "industries" — programmatic NAICS-style industry multiple pages.
// One entry per vertical (HVAC, dental, SaaS, etc.). Drives /industries/{slug}.
const industries = defineCollection({
  type: 'content',
  schema: z.object({
    industry: z.string(),
    naics: z.string().optional(),
    slug: z.string(),
    sdeMultipleLow: z.number(),
    sdeMultipleHigh: z.number(),
    revenueMultiple: z.number(),
    typicalDealSize: z.string(),
    daysOnMarket: z.number().optional(),
    updatedQuarter: z.string(), // e.g. "Q1 2026"
    sourceNote: z.string(),
    description: z.string(),
  }),
});

// "guides" — long-form pillar pages (separate from spoke articles).
const guides = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    slug: z.string(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('John Matsis'),
    tableOfContents: z.boolean().default(true),
    wordCount: z.number().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { articles, industries, guides };

export interface CaptureContentInput {
  summaryShort: string;
  tagsText: string;
}

export interface ContentGuardrailMatch {
  label: string;
  matchedText: string;
}

export interface CaptureContentAssessment {
  blockedMatches: ContentGuardrailMatch[];
  sensitiveMatches: ContentGuardrailMatch[];
  hasBlockedContent: boolean;
  hasSensitiveContent: boolean;
}

interface GuardrailPattern {
  label: string;
  pattern: RegExp;
}

const blockedPatterns: GuardrailPattern[] = [
  {
    label: 'family medical history',
    pattern: /\bfamily\s+(?:medical\s+)?history\b/i,
  },
  {
    label: 'genetic information',
    pattern: /\b(?:genetic|genetics|dna|gene\s+test|genetic\s+test|hereditary|inherited\s+condition)\b/i,
  },
  {
    label: 'relative medical history',
    pattern: /\b(?:mother|father|parent|sibling|brother|sister)\s+(?:has|had|was diagnosed|diagnosed)\b/i,
  },
];

const sensitivePatterns: GuardrailPattern[] = [
  {
    label: 'diagnosis or medical condition',
    pattern: /\b(?:diagnosis|diagnosed|medical\s+condition|condition|disability)\b/i,
  },
  {
    label: 'medication or treatment',
    pattern: /\b(?:medication|medicine|prescribed|prescription|dosage|therapy|treatment)\b/i,
  },
  {
    label: 'clinical procedure or test',
    pattern: /\b(?:mri|x-?ray|surgery|surgical|lab\s+test|blood\s+test)\b/i,
  },
  {
    label: 'mental health detail',
    pattern: /\b(?:anxiety|depression|ptsd|panic\s+attack)\b/i,
  },
  {
    label: 'medical restriction',
    pattern: /\b(?:work\s+restriction|medical\s+restriction|doctor'?s?\s+note)\b/i,
  },
];

const buildSearchText = ({ summaryShort, tagsText }: CaptureContentInput) =>
  `${summaryShort} ${tagsText}`.replace(/\s+/g, ' ').trim();

const matchPatterns = (text: string, patterns: GuardrailPattern[]) => {
  const matches = patterns.reduce<ContentGuardrailMatch[]>((accumulator, guardrail) => {
    const match = guardrail.pattern.exec(text);

    if (match?.[0]) {
      accumulator.push({
        label: guardrail.label,
        matchedText: match[0],
      });
    }

    return accumulator;
  }, []);

  return matches;
};

export const assessCaptureContent = (input: CaptureContentInput): CaptureContentAssessment => {
  const searchText = buildSearchText(input);
  const blockedMatches = matchPatterns(searchText, blockedPatterns);
  const sensitiveMatches = matchPatterns(searchText, sensitivePatterns);

  return {
    blockedMatches,
    sensitiveMatches,
    hasBlockedContent: blockedMatches.length > 0,
    hasSensitiveContent: sensitiveMatches.length > 0,
  };
};

export const formatGuardrailMatchLabels = (matches: ContentGuardrailMatch[]) =>
  matches.map((match) => match.label).join(', ');

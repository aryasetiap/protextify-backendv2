export interface WinstonAIRequest {
  text: string;
  language?: string;
  country?: string;
  excluded_sources?: string[];
}

export interface WinstonAIResponse {
  status: number;
  scanInformation: {
    service: string;
    scanTime: string;
    inputType: string;
  };
  result: {
    score: number;
    sourceCounts: number;
    textWordCounts: number;
    totalPlagiarismWords: number;
    identicalWordCounts: number;
    similarWordCounts: number;
  };
  sources: Array<{
    score: number;
    canAccess: boolean;
    url: string;
    title: string;
    plagiarismWords: number;
    identicalWordCounts: number;
    similarWordCounts: number;
    totalNumberOfWords: number;
    author?: string;
    description?: string;
    publishedDate?: number;
    source?: string;
    citation: boolean;
    plagiarismFound: Array<{
      startIndex: number;
      endIndex: number;
      sequence: string;
    }>;
    is_excluded: boolean;
  }>;
  attackDetected: {
    zero_width_space: boolean;
    homoglyph_attack: boolean;
  };
  text: string;
  similarWords: Array<{
    index: number;
    word: string;
  }>;
  citations: string[];
  indexes: Array<{
    startIndex: number;
    endIndex: number;
    sequence?: string;
  }>;
  credits_used: number;
  credits_remaining: number;
}

export interface PlagiarismJobData {
  submissionId: string;
  content: string;
  instructorId: string;
  studentId: string;
  excluded_sources?: string[];
  language?: string;
  country?: string;
}

export interface PlagiarismJobResult {
  submissionId: string;
  score: number;
  wordCount: number;
  creditsUsed: number;
  rawResponse: WinstonAIResponse | undefined; // 🔧 Ubah dari WinstonAIResponse ke optional
  status: 'completed' | 'failed';
  error?: string;
}

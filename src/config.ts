import dotenv from 'dotenv';
dotenv.config();

export interface Config {
  port: number;
  ai: {
    apiKey: string;
    model: string;
    retryMaxAttempts: number;
  };
  googleSheets: {
    id: string;
    credentialsPath: string;
  };
  googleDrive: {
    parentFolderId: string;
    credentialsPath: string;
  };
  pipeline: {
    writingPatternPath: string;
  };
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  ai: {
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'gemini-1.5-pro',
    retryMaxAttempts: parseInt(process.env.AI_RETRY_MAX_ATTEMPTS || '3', 10),
  },
  googleSheets: {
    id: process.env.GOOGLE_SHEETS_ID || '',
    credentialsPath: process.env.GOOGLE_CREDENTIALS_PATH || '',
  },
  googleDrive: {
    parentFolderId: process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || '',
    credentialsPath: process.env.GOOGLE_CREDENTIALS_PATH || '',
  },
  pipeline: {
    writingPatternPath: process.env.WRITING_PATTERN_PATH || '',
  },
};

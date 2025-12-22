
export enum Tab {
  HOME = 'home',
  LIBRARY = 'library',
  CONVERSATIONS = 'conversations',
  TRANSLATE = 'translate'
}

export enum DifficultyLevel {
  ALPHABET = 'Alphabet',
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced'
}

export interface Vocabulary {
  italian: string;
  bangla: string;
  pronunciation?: string;
  category: string;
  icon?: string;
}

export interface LessonContent {
  id: string;
  italian: string;
  bangla: string;
  letter?: string;
  exampleWord?: string;
}

export interface Lesson {
  id: string;
  title: string;
  banglaTitle: string;
  description: string;
  level: DifficultyLevel;
  icon: string;
  content: LessonContent[];
}

export interface DialogueLine {
  speaker: string;
  italian: string;
  bangla: string;
}

export interface ConversationScenario {
  id: string;
  title: string;
  banglaTitle: string;
  icon: string;
  dialogue: DialogueLine[];
}

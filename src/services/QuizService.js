// src/services/QuizService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import Papa from 'papaparse';
import { Platform } from 'react-native';

// For worst-case scenarios
const FALLBACK_QUESTIONS = [
  {
    id: 'A1',
    category: 'funfacts',
    question: 'How many hearts does an octopus have?',
    optionA: '1',
    optionB: '2',
    optionC: '3',
    optionD: '4',
    correctAnswer: 'C',
    explanation: 'Octopuses have three hearts: two pump blood through the gills and one pumps it through the body.'
  },
  {
    id: 'B1',
    category: 'psychology',
    question: 'What is the term for the tendency to recall unfinished tasks better than completed ones?',
    optionA: 'Zeigarnik effect',
    optionB: 'Dunning-Kruger effect',
    optionC: 'Placebo effect',
    optionD: 'Hawthorne effect',
    correctAnswer: 'A',
    explanation: 'The Zeigarnik effect describes how people remember uncompleted tasks better than completed ones due to psychological tension.'
  }
];

class QuizService {
  constructor() {
    this.questions = [];
    this.usedQuestionIds = new Set();
    this.categoryCounts = {};
    this.STORAGE_KEY = 'brainbites_quiz_data';
    this.isInitialized = false;
  }
  
  async initialize() {
    try {
      await this.loadSavedData();
      await this.loadQuestions();
      this._updateCategoryCounts();
      this.isInitialized = true;
      console.log('Quiz service initialized successfully');
      return Promise.resolve();
    } catch (error) {
      console.error('Error initializing quiz service:', error);
      
      // Use fallback questions if loading fails
      console.log('Using fallback questions');
      this.questions = FALLBACK_QUESTIONS;
      this._updateCategoryCounts();
      this.isInitialized = true;
      
      return Promise.resolve();
    }
  }
  
  async loadSavedData() {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const parsedData = JSON.parse(data);
        this.usedQuestionIds = new Set(parsedData.usedQuestionIds || []);
      }
    } catch (error) {
      console.error('Error loading saved quiz data:', error);
    }
  }
  
  async saveData() {
    try {
      const data = {
        usedQuestionIds: Array.from(this.usedQuestionIds),
        lastUpdated: new Date().toISOString()
      };
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving quiz data:', error);
    }
  }
  
  async loadQuestions() {
    console.log('Loading questions...');
    
    try {
      // For Android, use raw asset access
      if (Platform.OS === 'android') {
        console.log('Attempting to read from Android assets');
        
        try {
          // Try in root asset folder
          const fileContent = await RNFS.readFileAssets('questions.csv');
          const parsedQuestions = await this._parseCSVContent(fileContent);
          if (parsedQuestions.length > 0) {
            this.questions = parsedQuestions;
            console.log(`Loaded ${this.questions.length} questions from Android assets`);
            return;
          }
        } catch (assetError) {
          console.log('Error reading from root assets folder:', assetError.message);
          
          // Try with different paths
          try {
            const fileContent = await RNFS.readFileAssets('raw/questions.csv');
            const parsedQuestions = await this._parseCSVContent(fileContent);
            if (parsedQuestions.length > 0) {
              this.questions = parsedQuestions;
              console.log(`Loaded ${this.questions.length} questions from Android raw assets`);
              return;
            }
          } catch (rawError) {
            console.log('Error reading from raw assets folder:', rawError.message);
          }
        }
      }
      
      // For iOS or if Android asset loading failed, try main bundle
      if (Platform.OS === 'ios') {
        console.log('Attempting to read from iOS main bundle');
        
        try {
          const mainBundlePath = `${RNFS.MainBundlePath}/questions.csv`;
          const exists = await RNFS.exists(mainBundlePath);
          
          if (exists) {
            const fileContent = await RNFS.readFile(mainBundlePath, 'utf8');
            const parsedQuestions = await this._parseCSVContent(fileContent);
            if (parsedQuestions.length > 0) {
              this.questions = parsedQuestions;
              console.log(`Loaded ${this.questions.length} questions from iOS main bundle`);
              return;
            }
          } else {
            console.log('CSV file not found in main bundle');
          }
        } catch (bundleError) {
          console.log('Error reading from main bundle:', bundleError.message);
        }
      }
      
      // Try to load from document directory as last resort
      try {
        const docDirPath = `${RNFS.DocumentDirectoryPath}/questions.csv`;
        const exists = await RNFS.exists(docDirPath);
        
        if (exists) {
          const fileContent = await RNFS.readFile(docDirPath, 'utf8');
          const parsedQuestions = await this._parseCSVContent(fileContent);
          if (parsedQuestions.length > 0) {
            this.questions = parsedQuestions;
            console.log(`Loaded ${this.questions.length} questions from document directory`);
            return;
          }
        }
      } catch (docError) {
        console.log('Error reading from document directory:', docError.message);
      }
      
      // If all attempts failed, throw to trigger fallback
      throw new Error('Failed to load questions from any location');
      
    } catch (error) {
      console.error('Could not load questions:', error);
      
      // We'll use the fallback questions (handled in initialize)
      throw error;
    }
  }
  
  async _parseCSVContent(content) {
    return new Promise((resolve, reject) => {
      try {
        Papa.parse(content, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors && results.errors.length > 0) {
              console.warn('CSV parsing warnings:', results.errors);
            }
            
            if (!results.data || results.data.length === 0) {
              reject(new Error('CSV parsing produced no data'));
              return;
            }
            
            resolve(results.data);
          },
          error: (error) => {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  
  _updateCategoryCounts() {
    this.categoryCounts = {};
    this.questions.forEach(q => {
      if (q.category) {
        if (!this.categoryCounts[q.category]) {
          this.categoryCounts[q.category] = 0;
        }
        this.categoryCounts[q.category]++;
      }
    });
  }
  
  async getRandomQuestion(category = 'funfacts') {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      // Filter questions by category
      const categoryQuestions = this.questions.filter(q => q.category === category);
      
      if (categoryQuestions.length === 0) {
        console.warn(`No questions found for category: ${category}`);
        return this._getFallbackQuestion(category);
      }
      
      // Filter out recently used questions
      const availableQuestions = categoryQuestions.filter(q => !this.usedQuestionIds.has(q.id));
      
      // If we've used too many questions, reset tracking for this category
      if (availableQuestions.length === 0) {
        // Clear used questions for this category
        const categoryPrefix = category.charAt(0).toUpperCase();
        this.usedQuestionIds.forEach(id => {
          if (id.startsWith(categoryPrefix)) {
            this.usedQuestionIds.delete(id);
          }
        });
        
        await this.saveData();
        return this.getRandomQuestion(category);
      }
      
      // Pick a random question
      const randomIndex = Math.floor(Math.random() * availableQuestions.length);
      const question = availableQuestions[randomIndex];
      
      // Mark as used
      this.usedQuestionIds.add(question.id);
      await this.saveData();
      
      // Format the question
      return {
        id: question.id,
        question: question.question,
        options: {
          A: question.optionA,
          B: question.optionB,
          C: question.optionC,
          D: question.optionD
        },
        correctAnswer: question.correctAnswer,
        explanation: question.explanation
      };
    } catch (error) {
      console.error('Error getting random question:', error);
      return this._getFallbackQuestion(category);
    }
  }
  
  _getFallbackQuestion(category) {
    // Try to find a fallback for this category
    const categoryFallbacks = FALLBACK_QUESTIONS.filter(q => q.category === category);
    
    if (categoryFallbacks.length > 0) {
      const question = categoryFallbacks[0];
      return {
        id: question.id,
        question: question.question,
        options: {
          A: question.optionA,
          B: question.optionB,
          C: question.optionC,
          D: question.optionD
        },
        correctAnswer: question.correctAnswer,
        explanation: question.explanation
      };
    }
    
    // Default fallback
    return {
      id: 'fallback-default',
      question: "What is the capital of France?",
      options: {
        A: "London",
        B: "Berlin",
        C: "Paris",
        D: "Madrid"
      },
      correctAnswer: "C",
      explanation: "Paris is the capital and largest city of France."
    };
  }
  
  async getCategories() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      // Get unique categories from questions
      const categories = [...new Set(this.questions.map(q => q.category))];
      return categories.length > 0 ? categories : ['funfacts', 'psychology'];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return ['funfacts', 'psychology'];
    }
  }
  
  async resetUsedQuestions() {
    this.usedQuestionIds.clear();
    await this.saveData();
    console.log('Reset all used questions tracking');
  }
}

export default new QuizService();
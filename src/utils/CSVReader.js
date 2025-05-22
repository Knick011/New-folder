// src/utils/CSVReader.js
import RNFS from 'react-native-fs';
import Papa from 'papaparse';
import { Platform } from 'react-native';

class CSVReader {
  /**
   * Reads a CSV file from assets or file system with improved error handling
   * @param {string} fileName - The name of the CSV file 
   * @param {string} directory - Optional directory path for the file
   * @returns {Promise<Array>} - Promise resolving to parsed CSV data
   */
  static async readCSV(fileName, directory = '') {
    console.log(`Attempting to read CSV: ${fileName} from directory: ${directory || 'default'}`);
    
    // Array of paths to try in order
    const pathsToTry = [];
    
    // Add the specified path first if provided
    if (directory) {
      pathsToTry.push(`${directory}/${fileName}`);
    }
    
    // Add other potential paths to try
    pathsToTry.push(
      `${RNFS.DocumentDirectoryPath}/${fileName}`,
      `${RNFS.MainBundlePath}/${fileName}`,
      `assets/${fileName}`,
      `assets/data/${fileName}`,
      fileName
    );
    
    // For Android, try the assets directory specifically
    if (Platform.OS === 'android') {
      try {
        console.log('Attempting to read directly from Android assets...');
        const fileContent = await RNFS.readFileAssets(fileName);
        console.log('Successfully read from Android assets!');
        return this.parseCSV(fileContent);
      } catch (assetError) {
        console.log('Could not read directly from assets:', assetError.message);
      }
    }
    
    // Try each path in sequence
    for (const path of pathsToTry) {
      try {
        console.log(`Trying path: ${path}`);
        if (await RNFS.exists(path)) {
          console.log(`File exists at: ${path}`);
          const fileContent = await RNFS.readFile(path, 'utf8');
          console.log(`Successfully read file from: ${path}`);
          return this.parseCSV(fileContent);
        }
      } catch (error) {
        console.log(`Failed to read from path ${path}:`, error.message);
      }
    }
    
    // Last attempt for Android: try to copy from assets and then read
    if (Platform.OS === 'android') {
      try {
        const destPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
        console.log(`Attempting to copy from assets to: ${destPath}`);
        await RNFS.copyFileAssets(fileName, destPath);
        console.log('Copy successful, reading file...');
        const fileContent = await RNFS.readFile(destPath, 'utf8');
        return this.parseCSV(fileContent);
      } catch (copyError) {
        console.log('Copy from assets failed:', copyError.message);
      }
    }
    
    // If we've tried everything and still failed, throw an error
    throw new Error(`Could not find or read CSV file: ${fileName}`);
  }
  
  /**
   * Parse CSV content to array of objects with better error handling
   * @param {string} content - CSV content
   * @returns {Array} - Parsed data
   */
  static parseCSV(content) {
    return new Promise((resolve, reject) => {
      try {
        console.log('Parsing CSV content...');
        Papa.parse(content, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true, // Automatically convert strings to numbers where appropriate
          complete: (results) => {
            if (results.errors && results.errors.length > 0) {
              console.warn('CSV parsing had errors:', results.errors);
            }
            
            if (!results.data || results.data.length === 0) {
              console.warn('CSV parsing produced no data');
              reject(new Error('CSV parsing produced no data'));
              return;
            }
            
            console.log(`Successfully parsed ${results.data.length} rows from CSV`);
            resolve(results.data);
          },
          error: (error) => {
            console.error('Error parsing CSV:', error);
            reject(error);
          }
        });
      } catch (error) {
        console.error('Unexpected error during CSV parsing:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Generate a simple CSV to JSON converter for the app
   * @param {string} csvContent - The CSV content
   * @returns {string} - JSON string
   */
  static csvToJson(csvContent) {
    return new Promise((resolve, reject) => {
      Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          if (results.errors && results.errors.length > 0) {
            reject(new Error(`CSV parsing errors: ${JSON.stringify(results.errors)}`));
            return;
          }
          resolve(JSON.stringify(results.data));
        },
        error: reject
      });
    });
  }
}

export default CSVReader;
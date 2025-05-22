// src/utils/CsvToJsonConverter.js
import React, { useState } from 'react';
import { View, Text, Button, SafeAreaView, StyleSheet, ScrollView, TextInput } from 'react-native';
import RNFS from 'react-native-fs';
import Papa from 'papaparse';

/**
 * A utility component to convert CSV files to JSON format
 * This can be included temporarily in your app during development
 * to generate JSON files that work better with React Native's bundler
 */
const CsvToJsonConverter = () => {
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState([]);
  const [csvPath, setCsvPath] = useState('assets/data/questions.csv');
  const [jsonPath, setJsonPath] = useState('src/assets/data/questions.json');
  
  const addLog = (text) => {
    setLogs(prevLogs => [...prevLogs, `${new Date().toISOString().split('T')[1].slice(0, 8)}: ${text}`]);
  };
  
  const clearLogs = () => {
    setLogs([]);
  };
  
  const convertCsvToJson = async () => {
    try {
      setStatus('working');
      addLog(`Starting conversion from ${csvPath} to ${jsonPath}`);
      
      // Check if source exists
      let exists = false;
      
      // Try various paths
      const pathsToTry = [
        csvPath,
        `${RNFS.DocumentDirectoryPath}/${csvPath}`,
        `${RNFS.MainBundlePath}/${csvPath}`,
        `assets/${csvPath.split('/').pop()}`,
      ];
      
      let csvContent = null;
      
      for (const path of pathsToTry) {
        addLog(`Checking if file exists at: ${path}`);
        
        try {
          exists = await RNFS.exists(path);
          if (exists) {
            addLog(`Found file at: ${path}`);
            csvContent = await RNFS.readFile(path, 'utf8');
            addLog(`Successfully read CSV file, ${csvContent.length} characters`);
            break;
          }
        } catch (error) {
          addLog(`Error checking path ${path}: ${error.message}`);
        }
      }
      
      // Try direct asset access for Android
      if (!csvContent && Platform.OS === 'android') {
        try {
          addLog('Trying to read directly from Android assets');
          csvContent = await RNFS.readFileAssets(csvPath.split('/').pop());
          addLog('Successfully read from Android assets');
        } catch (error) {
          addLog(`Error reading from Android assets: ${error.message}`);
        }
      }
      
      if (!csvContent) {
        setStatus('error');
        setMessage(`Could not find or read the CSV file at any of the tried paths`);
        return;
      }
      
      // Parse CSV to JSON
      addLog('Parsing CSV to JSON...');
      
      Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          if (results.errors && results.errors.length > 0) {
            addLog(`Warning: CSV parsing had ${results.errors.length} errors`);
            console.warn('CSV parsing errors:', results.errors);
          }
          
          addLog(`Parsed ${results.data.length} rows from CSV`);
          
          // Convert to JSON string
          const jsonData = JSON.stringify(results.data, null, 2);
          
          // Write to destination file
          try {
            const destDir = jsonPath.substring(0, jsonPath.lastIndexOf('/'));
            
            // Ensure directory exists
            const dirExists = await RNFS.exists(destDir);
            if (!dirExists) {
              addLog(`Creating directory: ${destDir}`);
              await RNFS.mkdir(destDir);
            }
            
            // Write the file
            await RNFS.writeFile(
              `${RNFS.DocumentDirectoryPath}/${jsonPath}`,
              jsonData,
              'utf8'
            );
            
            addLog(`Successfully wrote JSON file to: ${RNFS.DocumentDirectoryPath}/${jsonPath}`);
            setStatus('success');
            setMessage(`Conversion complete! ${results.data.length} questions converted to JSON format.`);
          } catch (writeError) {
            addLog(`Error writing JSON file: ${writeError.message}`);
            setStatus('error');
            setMessage(`Error writing JSON file: ${writeError.message}`);
          }
        },
        error: (error) => {
          addLog(`Error parsing CSV: ${error.message}`);
          setStatus('error');
          setMessage(`Error parsing CSV: ${error.message}`);
        }
      });
    } catch (error) {
      addLog(`Unexpected error: ${error.message}`);
      setStatus('error');
      setMessage(`Unexpected error: ${error.message}`);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <Text style={styles.title}>CSV to JSON Converter</Text>
        <Text style={styles.subtitle}>Convert your questions.csv to JSON format</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>CSV Path:</Text>
          <TextInput
            style={styles.input}
            value={csvPath}
            onChangeText={setCsvPath}
            placeholder="Path to CSV file"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>JSON Output Path:</Text>
          <TextInput
            style={styles.input}
            value={jsonPath}
            onChangeText={setJsonPath}
            placeholder="Path for JSON output"
          />
        </View>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Convert CSV to JSON"
            onPress={convertCsvToJson}
            disabled={status === 'working'}
          />
        </View>
        
        {status !== 'idle' && (
          <View style={[
            styles.statusContainer,
            status === 'success' ? styles.successStatus : 
            status === 'error' ? styles.errorStatus : 
            styles.workingStatus
          ]}>
            <Text style={styles.statusText}>
              {status === 'working' ? 'Working...' : 
               status === 'success' ? 'Success!' : 
               'Error!'}
            </Text>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        )}
        
        <View style={styles.logContainer}>
          <View style={styles.logHeader}>
            <Text style={styles.logTitle}>Logs</Text>
            <Button title="Clear" onPress={clearLogs} />
          </View>
          
          <ScrollView style={styles.logScrollView}>
            {logs.map((log, index) => (
              <Text key={index} style={styles.logText}>{log}</Text>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 4,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    fontSize: 16,
    backgroundColor: 'white',
  },
  buttonContainer: {
    marginVertical: 16,
  },
  statusContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  successStatus: {
    backgroundColor: '#d4edda',
  },
  errorStatus: {
    backgroundColor: '#f8d7da',
  },
  workingStatus: {
    backgroundColor: '#fff3cd',
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
  },
  logContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    marginTop: 16,
    padding: 8,
    maxHeight: 300,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  logScrollView: {
    maxHeight: 250,
  },
  logText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});

export default CsvToJsonConverter;
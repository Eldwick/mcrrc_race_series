import { useState } from 'react';
import { Search, AlertTriangle, CheckCircle, ExternalLink, Download, Bug, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '../../components/ui';

interface TestResult {
  url: string;
  pageTitle: string;
  hasTable: boolean;
  tableCount: number;
  tableInfo: Array<{
    index: number;
    rowCount: number;
    columnCount: number;
    headers: string[];
    sampleRows: string[][];
  }>;
  extractedData: {
    raceName: string;
    raceDate: string;
    raceLocation: string;
    raceDistance: string;
    resultCount: number;
    sampleResults: any[];
  };
  errors: string[];
  timestamp: Date;
}

export function RaceUrlTesterPage() {
  const [testUrl, setTestUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [currentResult, setCurrentResult] = useState<TestResult | null>(null);

  // Common problematic race URLs for quick testing
  const commonTestUrls = [
    'https://mcrrc.org/race-results/2024-veterans-day-10k/',
    'https://mcrrc.org/race-results/2024-turkey-trot-5k/',
    'https://mcrrc.org/race-results/2024-summer-solstice-8k/',
  ];

  const handleTestUrl = async () => {
    if (!testUrl.trim()) return;
    
    setIsLoading(true);
    try {
      // Call our debug race scraper API
      const response = await fetch('/api/debug/race-scraper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: testUrl.trim() }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const testResult: TestResult = {
        ...result,
        timestamp: new Date(),
      };

      setCurrentResult(testResult);
      setTestResults(prev => [testResult, ...prev.slice(0, 4)]); // Keep last 5 results
      
    } catch (error) {
      console.error('Failed to test URL:', error);
      const errorResult: TestResult = {
        url: testUrl.trim(),
        pageTitle: 'Error',
        hasTable: false,
        tableCount: 0,
        tableInfo: [],
        extractedData: {
          raceName: '',
          raceDate: '',
          raceLocation: '',
          raceDistance: '',
          resultCount: 0,
          sampleResults: []
        },
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
        timestamp: new Date(),
      };
      setCurrentResult(errorResult);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickTest = (url: string) => {
    setTestUrl(url);
  };

  const downloadDebugReport = (result: TestResult) => {
    const dataStr = JSON.stringify(result, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `race-debug-${new Date().toISOString().slice(0,10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Race URL Testing</h1>
        <p className="text-gray-600 mt-1">
          Debug race scraping issues by testing specific URLs
        </p>
      </div>

      {/* URL Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5" />
            Test Race URL
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter MCRRC race results URL..."
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleTestUrl()}
              className="flex-1"
            />
            <Button 
              onClick={handleTestUrl}
              disabled={!testUrl.trim() || isLoading}
              loading={isLoading}
            >
              <Search className="w-4 h-4 mr-2" />
              Test URL
            </Button>
          </div>

          {/* Quick Test URLs */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Test URLs:</h4>
            <div className="flex flex-wrap gap-2">
              {commonTestUrls.map((url, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickTest(url)}
                  className="text-xs"
                >
                  Test #{index + 1}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Test Result */}
      {currentResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {currentResult.errors.length > 0 ? (
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
                Test Results
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadDebugReport(currentResult)}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* URL and Basic Info */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">URL Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">URL:</span>
                  <a 
                    href={currentResult.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {currentResult.url}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div>
                  <span className="font-medium">Page Title:</span> {currentResult.pageTitle || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Tested:</span> {currentResult.timestamp.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Table Analysis */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Table Analysis</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  {currentResult.hasTable ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="font-medium">
                    {currentResult.hasTable ? 'HTML Tables Found' : 'No HTML Tables Found'}
                  </span>
                  <span className="text-gray-600">({currentResult.tableCount} tables)</span>
                </div>
                
                {currentResult.tableInfo.map((table, index) => (
                  <div key={index} className="mt-3 p-3 bg-white rounded border">
                    <div className="text-sm">
                      <div className="font-medium">Table {index + 1}:</div>
                      <div>Rows: {table.rowCount}, Columns: {table.columnCount}</div>
                      <div>Headers: {table.headers.join(' | ')}</div>
                      {table.sampleRows.length > 0 && (
                        <div className="mt-2">
                          <div className="font-medium">Sample row:</div>
                          <code className="text-xs bg-gray-100 p-1 rounded">
                            {table.sampleRows[0].join(' | ')}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Extraction Results */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Extracted Data</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Race Name:</span> {currentResult.extractedData.raceName || 'Not found'}</div>
                  <div><span className="font-medium">Date:</span> {currentResult.extractedData.raceDate || 'Not found'}</div>
                  <div><span className="font-medium">Location:</span> {currentResult.extractedData.raceLocation || 'Not found'}</div>
                  <div><span className="font-medium">Distance:</span> {currentResult.extractedData.raceDistance || 'Not found'}</div>
                </div>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Results Found:</span> {currentResult.extractedData.resultCount}</div>
                  {currentResult.extractedData.sampleResults.length > 0 && (
                    <div>
                      <div className="font-medium">Sample Results:</div>
                      {currentResult.extractedData.sampleResults.slice(0, 3).map((result, i) => (
                        <div key={i} className="text-xs bg-gray-100 p-1 rounded mt-1">
                          {result.place}: {result.runner?.firstName} {result.runner?.lastName} ({result.bib}) - {result.time}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Errors */}
            {currentResult.errors.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Errors & Issues
                </h4>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  {currentResult.errors.map((error, index) => (
                    <div key={index} className="text-red-700 text-sm">
                      • {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Test History */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Recent Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                  onClick={() => setCurrentResult(result)}
                >
                  <div className="flex items-center gap-3">
                    {result.errors.length > 0 ? (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    <div>
                      <div className="font-medium text-sm truncate max-w-md">
                        {result.extractedData.raceName || result.pageTitle || 'Unknown Race'}
                      </div>
                      <div className="text-xs text-gray-600">
                        {result.extractedData.resultCount} results • {result.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    View Details
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

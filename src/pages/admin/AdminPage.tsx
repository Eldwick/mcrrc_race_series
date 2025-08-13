import { useState } from 'react';
import { Upload, Download, RefreshCw, Settings, Database, Users, Calendar } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select } from '../../components/ui';

export function AdminPage() {
  const { state, refreshData } = useData();
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const handleDataRefresh = async () => {
    setIsLoading(true);
    try {
      await refreshData();
      setLastSync(new Date());
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScrapeMCRRC = async () => {
    setIsLoading(true);
    try {
      // This would connect to the backend scraping service
      console.log('Scraping MCRRC data...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      await refreshData();
      setLastSync(new Date());
    } catch (error) {
      console.error('Failed to scrape MCRRC data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = () => {
    // This would export the current standings/results as CSV
    console.log('Exporting data...');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Manage race data, standings, and system settings
        </p>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {state.runners.length}
              </h3>
              <p className="text-sm text-gray-600">Active Runners</p>
            </div>
            <Users className="w-8 h-8 text-primary-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {state.races.length}
              </h3>
              <p className="text-sm text-gray-600">Total Races</p>
            </div>
            <Calendar className="w-8 h-8 text-primary-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {state.results.length}
              </h3>
              <p className="text-sm text-gray-600">Race Results</p>
            </div>
            <Database className="w-8 h-8 text-primary-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {lastSync ? lastSync.toLocaleDateString() : 'Never'}
              </h3>
              <p className="text-sm text-gray-600">Last Sync</p>
            </div>
            <RefreshCw className="w-8 h-8 text-primary-600" />
          </CardContent>
        </Card>
      </div>

      {/* Data Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Import/Sync */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Data Import & Sync
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">MCRRC Data Scraping</h4>
              <p className="text-sm text-gray-600 mb-4">
                Automatically scrape race results from MCRRC.org and update standings.
              </p>
              <Button 
                onClick={handleScrapeMCRRC}
                loading={isLoading}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Scrape Latest Results
              </Button>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-2">Manual Data Upload</h4>
              <p className="text-sm text-gray-600 mb-4">
                Upload CSV files with race results or runner information.
              </p>
              <div className="space-y-2">
                <Input type="file" accept=".csv" />
                <Button variant="secondary" size="sm" className="w-full">
                  Upload CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Data Export
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Export Standings</h4>
              <p className="text-sm text-gray-600 mb-4">
                Export current series standings and race results.
              </p>
              <div className="space-y-2">
                <Select placeholder="Select series">
                  {state.series.map(series => (
                    <option key={series.id} value={series.id}>
                      {series.name} ({series.year})
                    </option>
                  ))}
                </Select>
                <Button 
                  onClick={handleExportData}
                  variant="secondary" 
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export to CSV
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-2">Backup Data</h4>
              <p className="text-sm text-gray-600 mb-4">
                Create a complete backup of all system data.
              </p>
              <Button variant="outline" size="sm" className="w-full">
                <Database className="w-4 h-4 mr-2" />
                Create Backup
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manual Overrides */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Manual Overrides
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-yellow-800 mb-2">⚠️ Use with Caution</h4>
            <p className="text-sm text-yellow-700">
              Manual overrides should only be used to correct data errors or handle special circumstances 
              (DQ, DNF, membership corrections, etc.). All changes are logged for audit purposes.
            </p>
          </div>

          <div className="space-y-6">
            {/* Race Result Override */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Override Race Result</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Select placeholder="Select race">
                  {state.races.map(race => (
                    <option key={race.id} value={race.id}>
                      {race.name} ({new Date(race.date).toLocaleDateString()})
                    </option>
                  ))}
                </Select>
                <Select placeholder="Select runner">
                  {state.runners.map(runner => (
                    <option key={runner.id} value={runner.id}>
                      {runner.firstName} {runner.lastName} (#{runner.bibNumber})
                    </option>
                  ))}
                </Select>
                <Select placeholder="Override type">
                  <option value="dnf">Mark as DNF</option>
                  <option value="dq">Mark as DQ</option>
                  <option value="time">Correct Time</option>
                  <option value="place">Correct Place</option>
                </Select>
                <Button variant="destructive" size="sm">
                  Apply Override
                </Button>
              </div>
            </div>

            {/* Standings Recalculation */}
            <div className="border-t pt-6">
              <h4 className="font-medium text-gray-900 mb-4">Recalculate Standings</h4>
              <p className="text-sm text-gray-600 mb-4">
                Force a complete recalculation of all series standings based on current rules and data.
              </p>
              <div className="flex items-center gap-4">
                <Select className="flex-1" placeholder="Select series">
                  {state.series.map(series => (
                    <option key={series.id} value={series.id}>
                      {series.name} ({series.year})
                    </option>
                  ))}
                </Select>
                <Button 
                  onClick={handleDataRefresh}
                  loading={isLoading}
                  variant="secondary"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recalculate
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            System Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Scoring Rules</h4>
              <p className="text-sm text-gray-600 mb-4">
                Current system uses MCRRC Championship Series rules.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Overall Top N:</span>
                  <span className="font-medium">10</span>
                </div>
                <div className="flex justify-between">
                  <span>Age Group Top N:</span>
                  <span className="font-medium">10</span>
                </div>
                <div className="flex justify-between">
                  <span>Min Qualifying Races:</span>
                  <span className="font-medium">5</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Counting Races:</span>
                  <span className="font-medium">10</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Auto-Sync Settings</h4>
              <p className="text-sm text-gray-600 mb-4">
                Configure automatic data synchronization from MCRRC.org.
              </p>
              <div className="space-y-2">
                <Select defaultValue="daily">
                  <option value="manual">Manual Only</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </Select>
                <div className="text-xs text-gray-500">
                  Next sync: Tomorrow at 6:00 AM
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

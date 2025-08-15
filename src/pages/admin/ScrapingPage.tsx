import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../services/api';

interface ScrapingStatus {
  overview: {
    total_series: string;
    total_runners: string;
    total_races: string;
    total_results: string;
    scraped_races: string;
    last_scrape_time: string | null;
  };
  dataQuality: {
    total_results: string;
    dnf_count: string;
    dq_count: string;
    missing_time_count: string;
    chip_time_count: string;
  };
  series: Array<{
    id: string;
    name: string;
    year: number;
    description: string;
    race_count: string;
    runner_count: string;
  }>;
  recommendations: string[];
}

export function ScrapingPage() {
  const [status, setStatus] = useState<ScrapingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [scrapingForm, setScrapingForm] = useState({
    secret: 'dev-scraping-secret',
    year: new Date().getFullYear(),
    url: '',
    action: 'discover' as 'discover' | 'scrape-race' | 'scrape-all'
  });
  const [scrapingResult, setScrapingResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const response = await api.scrapingStatus();
      setStatus(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load scraping status');
      console.error('Status error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScraping = async () => {
    try {
      setLoading(true);
      setScrapingResult(null);
      setError(null);

      const response = await api.scrapeRaces({
        secret: scrapingForm.secret,
        action: scrapingForm.action,
        year: scrapingForm.year,
        url: scrapingForm.url || undefined
      });

      setScrapingResult(response);
      await loadStatus(); // Refresh status after scraping
    } catch (err: any) {
      setError(err.message || 'Scraping failed');
      console.error('Scraping error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Race Results Scraping</h1>
          <p className="text-gray-600">Manage MCRRC race result scraping operations</p>
        </div>
        <Button onClick={loadStatus} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh Status'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Current Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Series</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.overview.total_series || '0'}</div>
            <p className="text-sm text-gray-600">Total series configured</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Races</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.overview.total_races || '0'}</div>
            <p className="text-sm text-gray-600">
              {status?.overview.scraped_races || '0'} scraped
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Runners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.overview.total_runners || '0'}</div>
            <p className="text-sm text-gray-600">Registered runners</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.overview.total_results || '0'}</div>
            <p className="text-sm text-gray-600">Race results stored</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Quality */}
      {status && parseInt(status.overview.total_results) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Data Quality</CardTitle>
            <CardDescription>Statistics about scraped data quality</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-lg font-semibold">{status.dataQuality.dnf_count}</div>
                <p className="text-sm text-gray-600">DNF results</p>
              </div>
              <div>
                <div className="text-lg font-semibold">{status.dataQuality.dq_count}</div>
                <p className="text-sm text-gray-600">DQ results</p>
              </div>
              <div>
                <div className="text-lg font-semibold">{status.dataQuality.missing_time_count}</div>
                <p className="text-sm text-gray-600">Missing times</p>
              </div>
              <div>
                <div className="text-lg font-semibold">{status.dataQuality.chip_time_count}</div>
                <p className="text-sm text-gray-600">With chip times</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Series List */}
      <Card>
        <CardHeader>
          <CardTitle>Series</CardTitle>
          <CardDescription>Configured championship series</CardDescription>
        </CardHeader>
        <CardContent>
          {status?.series.map((series) => (
            <div key={series.id} className="flex items-center justify-between p-4 border rounded mb-2">
              <div>
                <h3 className="font-semibold">{series.name}</h3>
                <p className="text-sm text-gray-600">{series.description}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">Year: {series.year}</Badge>
                  <Badge variant="outline">Races: {series.race_count}</Badge>
                  <Badge variant="outline">Runners: {series.runner_count}</Badge>
                </div>
              </div>
              <Button 
                size="sm" 
                onClick={() => setScrapingForm({
                  ...scrapingForm, 
                  action: 'scrape-all'
                })}
              >
                Scrape All
              </Button>
            </div>
          ))}

          {(!status?.series || status.series.length === 0) && (
            <p className="text-gray-500 text-center py-4">No series configured yet</p>
          )}
        </CardContent>
      </Card>

      {/* Scraping Operations */}
      <Card>
        <CardHeader>
          <CardTitle>Scraping Operations</CardTitle>
          <CardDescription>Discover and scrape race results from MCRRC.org</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Action</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={scrapingForm.action}
                onChange={(e) => setScrapingForm({
                  ...scrapingForm,
                  action: e.target.value as any
                })}
              >
                <option value="discover">Discover URLs</option>
                <option value="scrape-race">Scrape Single Race</option>
                <option value="scrape-all">Scrape All Races</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Year</label>
              <Input
                type="number"
                value={scrapingForm.year}
                onChange={(e) => setScrapingForm({
                  ...scrapingForm,
                  year: parseInt(e.target.value)
                })}
              />
            </div>
          </div>

          {scrapingForm.action === 'scrape-race' && (
            <div>
              <label className="block text-sm font-medium mb-1">Race URL</label>
              <Input
                type="url"
                placeholder="https://mcrrc.org/race-results/..."
                value={scrapingForm.url}
                onChange={(e) => setScrapingForm({
                  ...scrapingForm,
                  url: e.target.value
                })}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Secret</label>
            <Input
              type="password"
              value={scrapingForm.secret}
              onChange={(e) => setScrapingForm({
                ...scrapingForm,
                secret: e.target.value
              })}
            />
          </div>

          <Button 
            onClick={handleScraping} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Processing...' : 'Start Scraping'}
          </Button>
        </CardContent>
      </Card>

      {/* Scraping Results */}
      {scrapingResult && (
        <Card>
          <CardHeader>
            <CardTitle>Scraping Results</CardTitle>
            <CardDescription>
              Action: {scrapingResult.action} | Duration: {scrapingResult.duration}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify(scrapingResult.data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {status && status.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>Suggested actions to improve data quality</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {status.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">
                    {index + 1}
                  </Badge>
                  <span className="text-sm">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Last Update */}
      <div className="text-center text-sm text-gray-500">
        Last scrape: {formatDate(status?.overview?.last_scrape_time ?? null)}
      </div>
    </div>
  );
}

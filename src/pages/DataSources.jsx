import { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Database, Map, Upload, Download, AlertCircle } from 'lucide-react';
import * as api from '../api/client';

const DataSources = () => {
  const [uploadFile, setUploadFile] = useState(null);
  const [replaceAll, setReplaceAll] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [parcelTotal, setParcelTotal] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.getParcels('All', 0, 1).then((r) => setParcelTotal(r.total ?? null)).catch(() => setParcelTotal(null));
  }, [uploadResult]);

  const dataSources = [
    {
      name: 'Parcel dataset',
      status: 'Active',
      type: 'Parcels (GIS/CSV/upload)',
      records: parcelTotal != null ? `${parcelTotal} parcels` : '—',
      updated: 'As loaded',
      icon: Map,
      color: 'blue',
    },
    {
      name: 'Estimated consumption',
      status: 'Active',
      type: 'Model (0.09 / 0.1 m³/c per person per day)',
      records: 'From parcel data',
      updated: 'On demand',
      icon: Database,
      color: 'purple',
      description: 'No real meter data; consumption is estimated from population and land-use.',
    },
    {
      name: 'OpenStreetMap Basemap',
      status: 'Connected',
      type: 'Tile Service',
      records: 'Live',
      updated: 'Live',
      icon: Map,
      color: 'orange',
    },
  ];

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    setUploadFile(f || null);
    setUploadResult(null);
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      setUploadError('Please select a file.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    setUploadResult(null);
    try {
      const result = await api.uploadParcelDataset(uploadFile, replaceAll);
      setUploadResult(result);
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'Active' || status === 'Connected') {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const getIconColor = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600',
      orange: 'bg-orange-100 text-orange-600',
    };
    return colors[color] || colors.blue;
  };

  const sampleCsv = `parcel_id,land_use,population,lat,lng
P-0001,Residential,4,40.7128,-74.006
P-0002,Commercial,12,40.713,-74.005
P-0003,Mixed-use,6,40.714,-74.004`;

  const handleDownloadSample = () => {
    const blob = new Blob([sampleCsv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'parcels_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 pt-6 pb-4 bg-white/90 backdrop-blur-md border-b border-gray-200/60 lg:pl-6 pl-16 animate-fade-in">
        <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Data Sources
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* Upload parcel dataset */}
        <div
          className="card-gradient mb-6 sm:mb-8 p-5 sm:p-6 opacity-0 animate-fade-in-up"
          style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-indigo-100 text-indigo-600">
              <Upload size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Upload parcel dataset</h3>
              <p className="text-sm text-gray-600 mt-0.5">
                Import parcels from CSV, JSON, or GeoJSON. Map and analytics will use the uploaded data.
              </p>
            </div>
          </div>
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,.geojson"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer sm:whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={replaceAll}
                  onChange={(e) => setReplaceAll(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Replace all existing parcels
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading || !uploadFile}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Upload file
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDownloadSample}
                className="btn-secondary flex items-center gap-2"
              >
                <Download size={18} />
                Download sample CSV
              </button>
            </div>
            {uploadError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-800 text-sm">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}
            {uploadResult && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 text-green-800 text-sm">
                <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{uploadResult.message}</p>
                  {uploadResult.errors?.length > 0 && (
                    <ul className="mt-1 list-disc list-inside text-xs opacity-90">
                      {uploadResult.errors.slice(0, 5).map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                      {uploadResult.errors.length > 5 && (
                        <li>… and {uploadResult.errors.length - 5} more</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-200">
            Required columns: <code className="bg-gray-100 px-1 rounded">parcel_id</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">land_use</code> (Residential | Commercial | Mixed-use),{' '}
            <code className="bg-gray-100 px-1 rounded">population</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">lat</code>,{' '}
            <code className="bg-gray-100 px-1 rounded">lng</code>. GeoJSON: use <code className="bg-gray-100 px-1 rounded">properties</code> and optional Point <code className="bg-gray-100 px-1 rounded">geometry</code> for lat/lng.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-6xl mx-auto">
          {dataSources.map((source, index) => {
            const Icon = source.icon;
            return (
              <div
                key={index}
                className="card-gradient opacity-0 animate-fade-in-up hover:shadow-xl transition-shadow duration-300"
                style={{ animationDelay: `${(index + 1) * 80}ms`, animationFillMode: 'forwards' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${getIconColor(source.color)}`}>
                      <Icon size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{source.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{source.type}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(source.status)}`}>
                    {source.status}
                  </span>
                </div>

                <div className="space-y-2 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Records:</span>
                    <span className="font-medium text-gray-900">{source.records}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Updated:</span>
                    <span className="font-medium text-gray-900">{source.updated}</span>
                  </div>
                  {source.description && (
                    <p className="text-xs text-gray-500 pt-2">{source.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DataSources;

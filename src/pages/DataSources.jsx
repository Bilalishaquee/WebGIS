import { CheckCircle2, Database, FileText, Map } from 'lucide-react';

const DataSources = () => {
  const dataSources = [
    {
      name: 'Parcel Registry',
      status: 'Active',
      type: 'GIS Shapefile',
      records: '380 records',
      updated: '2026-02-15',
      icon: Map,
      color: 'blue',
    },
    {
      name: 'Population Census',
      status: 'Active',
      type: 'CSV Dataset',
      records: '380 records',
      updated: '2026-01-20',
      icon: FileText,
      color: 'green',
    },
    {
      name: 'Municipal Water Records',
      status: 'Active',
      type: 'Database',
      records: '12,400 records',
      updated: '2026-02-25',
      icon: Database,
      color: 'purple',
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
  
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 pt-6 pb-4 bg-white/90 backdrop-blur-md border-b border-gray-200/60 lg:pl-6 pl-16 animate-fade-in">
        <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Data Sources
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-6xl mx-auto">
        {dataSources.map((source, index) => {
          const Icon = source.icon;
          return (
            <div
              key={index}
              className="card-gradient opacity-0 animate-fade-in-up hover:shadow-xl transition-shadow duration-300"
              style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'forwards' }}
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

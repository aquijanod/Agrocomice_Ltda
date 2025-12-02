import React from 'react';
import { Users, Droplets, Sun, Truck, Sprout, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Lun', harvest: 4000 },
  { name: 'Mar', harvest: 3000 },
  { name: 'Mie', harvest: 2000 },
  { name: 'Jue', harvest: 2780 },
  { name: 'Vie', harvest: 1890 },
  { name: 'Sab', harvest: 2390 },
  { name: 'Dom', harvest: 3490 },
];

const StatCard: React.FC<{ title: string; value: string; icon: React.ElementType; color: string }> = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
    <div className={`p-4 rounded-full ${color} bg-opacity-10 text-${color.split('-')[1]}-600`}>
      <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
    </div>
    <div>
      <p className="text-sm text-slate-500 font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Panel de Control</h1>
        <p className="text-slate-500">Resumen de operaciones - Agro Comice Ltda</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <StatCard title="Trabajadores Activos" value="24" icon={Users} color="bg-blue-500" />
        <StatCard title="Cosecha Diaria (Kg)" value="1,240" icon={Sprout} color="bg-green-500" />
        <StatCard title="Riego (Lts/Hoy)" value="45,000" icon={Droplets} color="bg-cyan-500" />
        <StatCard title="Despachos Pendientes" value="3" icon={Truck} color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-800">Producción Semanal</h3>
            <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
              <TrendingUp size={12} /> +12%
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorHarvest" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#1e293b' }}
                />
                <Area type="monotone" dataKey="harvest" stroke="#82ca9d" fillOpacity={1} fill="url(#colorHarvest)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weather Widget (Visual Mock) */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="font-bold text-lg mb-1">Clima en Campo</h3>
            <p className="text-blue-100 text-sm mb-6">Fundo Santa Teresa, Curicó</p>
            
            <div className="flex items-center justify-between">
              <div>
                <span className="text-5xl font-bold">24°</span>
                <p className="text-blue-100 mt-1">Soleado</p>
              </div>
              <Sun size={64} className="text-yellow-300 animate-pulse" />
            </div>

            <div className="mt-8 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="bg-white/20 rounded p-2 backdrop-blur-sm">
                <span className="block opacity-70">Humedad</span>
                <span className="font-bold">45%</span>
              </div>
              <div className="bg-white/20 rounded p-2 backdrop-blur-sm">
                <span className="block opacity-70">Viento</span>
                <span className="font-bold">12 km/h</span>
              </div>
              <div className="bg-white/20 rounded p-2 backdrop-blur-sm">
                <span className="block opacity-70">UV</span>
                <span className="font-bold">Alto</span>
              </div>
            </div>
          </div>
          
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

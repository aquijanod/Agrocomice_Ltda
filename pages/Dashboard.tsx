import React, { useEffect, useState } from 'react';
import { Users, CloudSun, Calendar as CalIcon, MapPin, Sun, Wind, Droplets, ChevronLeft, ChevronRight, Clock, Filter, X, Eye, TrendingUp, CloudRain, Cloud, CloudDrizzle, Umbrella } from 'lucide-react';
import { getActivities, getUsers } from '../services/dataService';
import { Activity, User, ActivityStatus } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, CartesianGrid } from 'recharts';

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

// --- MOCK WEATHER DATA GENERATOR ---
const generateHourlyData = (baseTemp: number, condition: 'sunny'|'cloudy'|'rainy') => {
    const data = [];
    for (let i = 0; i < 24; i += 3) { // Every 3 hours to fit chart nicely
        let temp = baseTemp;
        let precip = 0;
        let wind = 10;

        // Simple mock simulation
        if (i < 6) temp -= 5;
        else if (i < 15) temp += 5;
        else temp -= 2;

        if (condition === 'rainy') {
            precip = Math.floor(Math.random() * 60) + 20;
            wind += 10;
        } else if (condition === 'cloudy') {
             precip = Math.floor(Math.random() * 20);
        }

        wind += Math.floor(Math.random() * 10);

        data.push({
            time: `${i}:00`,
            temp: Math.floor(temp),
            precip: precip,
            wind: wind
        });
    }
    return data;
};

// 7 Days of detailed data
const weatherData = [
    { id: 0, day: 'Hoy', fullDay: 'miércoles', date: '12 p.m.', max: 27, min: 14, current: 27, condition: 'Soleado', icon: Sun, hourly: generateHourlyData(25, 'sunny'), humidity: 41, wind: 11, rainProb: 0 },
    { id: 1, day: 'Jue', fullDay: 'jueves', date: 'Provisión', max: 32, min: 13, current: 31, condition: 'Parcialmente Nublado', icon: CloudSun, hourly: generateHourlyData(28, 'cloudy'), humidity: 45, wind: 14, rainProb: 10 },
    { id: 2, day: 'Vie', fullDay: 'viernes', date: 'Provisión', max: 30, min: 12, current: 28, condition: 'Despejado', icon: Sun, hourly: generateHourlyData(26, 'sunny'), humidity: 38, wind: 12, rainProb: 0 },
    { id: 3, day: 'Sáb', fullDay: 'sábado', date: 'Provisión', max: 29, min: 13, current: 25, condition: 'Nublado', icon: Cloud, hourly: generateHourlyData(24, 'cloudy'), humidity: 55, wind: 18, rainProb: 20 },
    { id: 4, day: 'Dom', fullDay: 'domingo', date: 'Provisión', max: 24, min: 15, current: 22, condition: 'Lluvia Ligera', icon: CloudDrizzle, hourly: generateHourlyData(20, 'rainy'), humidity: 75, wind: 22, rainProb: 80 },
    { id: 5, day: 'Lun', fullDay: 'lunes', date: 'Provisión', max: 30, min: 14, current: 28, condition: 'Parcial', icon: CloudSun, hourly: generateHourlyData(27, 'cloudy'), humidity: 50, wind: 15, rainProb: 5 },
    { id: 6, day: 'Mar', fullDay: 'martes', date: 'Provisión', max: 30, min: 12, current: 29, condition: 'Soleado', icon: Sun, hourly: generateHourlyData(28, 'sunny'), humidity: 40, wind: 10, rainProb: 0 },
];

type WeatherMetric = 'temp' | 'precip' | 'wind';

const Dashboard: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // State for Filters
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | 'Todos'>('Todos');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // State for View Modal
  const [viewActivity, setViewActivity] = useState<Activity | null>(null);

  // Calendar State
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  // --- WEATHER WIDGET STATE ---
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [activeMetric, setActiveMetric] = useState<WeatherMetric>('temp');

  const currentWeatherData = weatherData[selectedDayIndex];

  useEffect(() => {
    const loadData = async () => {
        const [acts, usrs] = await Promise.all([getActivities(), getUsers()]);
        // Sort by start date (Ascending: Earliest first)
        const sorted = acts.sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        setActivities(sorted);
        setUsers(usrs);
    };
    loadData();
  }, []);

  // Filtered Counts (Static KPIs)
  const workerCount = users.filter(u => u.role === 'Trabajador').length;
  const pendingCount = activities.filter(a => a.status === 'Pendiente').length;
  const inProgressCount = activities.filter(a => a.status === 'En Progreso').length;

  // Calendar Logic
  const daysInMonth = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1).getDay(); 
  const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Adjust for Monday start

  const changeMonth = (delta: number) => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + delta, 1));
  };

  const handleDayClick = (day: number) => {
      const newDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), day);
      // Toggle selection
      if (selectedDate && newDate.getTime() === selectedDate.getTime()) {
          setSelectedDate(null);
      } else {
          setSelectedDate(newDate);
      }
  };

  // Helper to get user name
  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Sin asignar';

  // Logic to get activities that match filters AND a specific day
  const getActivitiesForDay = (day: number) => {
      const dateStr = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), day).toISOString().split('T')[0];
      
      return activities.filter(act => {
          // 1. Date Check
          const inRange = dateStr >= act.startDate && dateStr <= act.endDate;
          // 2. Status Check (Global Filter)
          const statusMatch = statusFilter === 'Todos' || act.status === statusFilter;
          
          return inRange && statusMatch;
      });
  };

  // Logic for the Main List Display
  const getFilteredList = () => {
      let filtered = activities;

      // 1. Filter by Status
      if (statusFilter !== 'Todos') {
          filtered = filtered.filter(a => a.status === statusFilter);
      }

      // 2. Filter by Selected Date (if any)
      if (selectedDate) {
          const dateStr = selectedDate.toISOString().split('T')[0];
          filtered = filtered.filter(a => dateStr >= a.startDate && dateStr <= a.endDate);
      }

      return filtered;
  };

  const displayList = getFilteredList();

  // --- CHART CONFIGURATION ---
  const getChartConfig = () => {
      switch(activeMetric) {
          case 'precip':
              return { 
                  dataKey: 'precip', 
                  color: '#3b82f6', // Blue
                  fillId: 'colorPrecip',
                  unit: '%',
                  domain: [0, 100]
              };
          case 'wind':
              return { 
                  dataKey: 'wind', 
                  color: '#10b981', // Emerald
                  fillId: 'colorWind',
                  unit: ' km/h',
                  domain: ['dataMin', 'dataMax + 10']
              };
          default: // temp
              return { 
                  dataKey: 'temp', 
                  color: '#f59e0b', // Amber
                  fillId: 'colorTemp',
                  unit: '°',
                  domain: ['dataMin - 5', 'dataMax + 5']
              };
      }
  };

  const chartConfig = getChartConfig();

  // Custom Tick for Chart
  const CustomTick = (props: any) => {
      const { x, y, payload } = props;
      return (
          <g transform={`translate(${x},${y})`}>
              <text x={0} y={0} dy={16} textAnchor="middle" fill="#64748b" fontSize={11}>
                  {payload.value}
              </text>
          </g>
      );
  };
  
  // Custom Label for Chart Points
  const CustomLabel = (props: any) => {
      const { x, y, value } = props;
      return (
          <text x={x} y={y} dy={-10} fill="#334155" fontSize={12} fontWeight="bold" textAnchor="middle">
              {value}{chartConfig.unit}
          </text>
      );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Panel de Control</h1>
        <p className="text-slate-500">Resumen de operaciones - Agro Comice Ltda</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Trabajadores Activos" value={workerCount.toString()} icon={Users} color="bg-blue-500" />
        <StatCard title="Actividades Pendientes" value={pendingCount.toString()} icon={Clock} color="bg-orange-500" />
        <StatCard title="Actividades en Progreso" value={inProgressCount.toString()} icon={TrendingUp} color="bg-indigo-500" />
      </div>

      {/* Separator 1: Between KPIs and Map/Weather */}
      <hr className="border-slate-200" />

      {/* TOP SECTION: Map & Weather */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Satellite Map */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden h-[450px] relative group">
                <iframe 
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }}
                    loading="lazy" 
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src="https://maps.google.com/maps?q=-35.6789825,-71.4169345&t=k&z=17&ie=UTF8&iwloc=&output=embed"
                    title="Ubicación Colbún"
                ></iframe>
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1">
                    <MapPin size={12} className="text-red-600"/> Fundo Colbún
                </div>
            </div>

            {/* Weather Widget - Interactive */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[450px] flex flex-col font-sans transition-all">
                
                {/* Header Section (Dynamic) */}
                <div className="flex justify-between items-start mb-6 animate-fade-in">
                    <div className="flex gap-4">
                         {/* Dynamic Icon */}
                        <currentWeatherData.icon size={64} className={`
                            ${currentWeatherData.condition.includes('Soleado') || currentWeatherData.condition.includes('Despejado') ? 'text-amber-400 fill-amber-400' : ''}
                            ${currentWeatherData.condition.includes('Nublado') || currentWeatherData.condition.includes('Lluvia') ? 'text-slate-400 fill-slate-200' : ''}
                        `} />
                        <div>
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-6xl font-normal text-slate-800 tracking-tight">{currentWeatherData.current}</h2>
                                <span className="text-xl text-slate-500">°C</span>
                            </div>
                            <div className="text-slate-500 text-sm mt-1">
                                <span className="font-medium text-slate-700">{currentWeatherData.condition}</span>
                                <span className="mx-2">•</span>
                                <span className="capitalize">{currentWeatherData.fullDay}</span>
                            </div>
                            <p className="text-slate-400 text-xs mt-0.5">Colbun, Colbún</p>
                        </div>
                    </div>
                    
                    {/* Stats (Dynamic) */}
                    <div className="text-sm text-slate-600 space-y-1 text-right">
                        <p>Precipitaciones: <span className="font-medium text-slate-800">{currentWeatherData.rainProb}%</span></p>
                        <p>Humedad: <span className="font-medium text-slate-800">{currentWeatherData.humidity}%</span></p>
                        <p>Viento: <span className="font-medium text-slate-800">{currentWeatherData.wind} km/h</span></p>
                    </div>
                </div>

                {/* Tabs (Interactive) */}
                <div className="flex border-b border-slate-200 mb-4">
                    <button 
                        onClick={() => setActiveMetric('temp')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeMetric === 'temp' ? 'text-slate-800 border-amber-400' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
                    >
                        Temperatura
                    </button>
                    <button 
                        onClick={() => setActiveMetric('precip')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeMetric === 'precip' ? 'text-slate-800 border-blue-500' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
                    >
                        Precipitaciones
                    </button>
                    <button 
                        onClick={() => setActiveMetric('wind')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeMetric === 'wind' ? 'text-slate-800 border-emerald-500' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
                    >
                        Viento
                    </button>
                </div>

                {/* Chart Section (Interactive) */}
                <div className="flex-1 w-full min-h-0 relative -ml-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={currentWeatherData.hourly} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.05}/>
                                </linearGradient>
                                <linearGradient id="colorPrecip" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                                </linearGradient>
                                <linearGradient id="colorWind" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                                </linearGradient>
                            </defs>
                            <XAxis 
                                dataKey="time" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={<CustomTick />}
                                interval={0}
                            />
                            <YAxis hide domain={chartConfig.domain as any} />
                            <Tooltip 
                                formatter={(value: any) => [`${value}${chartConfig.unit}`, activeMetric === 'temp' ? 'Temp' : activeMetric === 'precip' ? 'Lluvia' : 'Viento']}
                                cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} 
                                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                            />
                            <Area 
                                type="monotone" 
                                dataKey={chartConfig.dataKey} 
                                stroke={chartConfig.color} 
                                strokeWidth={2} 
                                fillOpacity={1} 
                                fill={`url(#${chartConfig.fillId})`} 
                                animationDuration={500}
                            >
                                <LabelList content={<CustomLabel />} />
                            </Area>
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Daily Forecast List (Interactive) */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex justify-between overflow-x-auto pb-2 scrollbar-hide gap-2">
                        {weatherData.map((day, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => setSelectedDayIndex(idx)}
                                className={`
                                    flex flex-col items-center min-w-[55px] py-2 px-1 rounded-lg transition-all cursor-pointer border border-transparent
                                    ${selectedDayIndex === idx ? 'bg-blue-50 border-blue-200 shadow-sm transform scale-105' : 'hover:bg-slate-50 text-slate-500'}
                                `}
                            >
                                <span className={`text-sm font-medium mb-2 ${selectedDayIndex === idx ? 'text-blue-700' : 'text-slate-600'}`}>
                                    {day.day}
                                </span>
                                <day.icon size={24} className={`mb-2 
                                    ${day.icon === Sun ? 'text-amber-400 fill-amber-400' : 
                                      day.icon === Cloud ? 'text-slate-400 fill-slate-200' : 
                                      day.icon === CloudDrizzle ? 'text-blue-400' :
                                      'text-slate-500'}
                                `} />
                                <div className="text-xs font-bold text-slate-700">
                                    <span>{day.max}°</span>
                                    <span className="text-slate-400 ml-1 font-normal">{day.min}°</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

      </div>

      {/* Separator 2: Between Map/Weather and Activities/Calendar */}
      <hr className="border-slate-200" />

      {/* BOTTOM SECTION: Activities & Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Activities List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <CalIcon size={20} className="text-blue-600"/> Agenda de Actividades
                    </h3>
                    
                    <div className="flex items-center gap-2">
                        {/* Status Filter Dropdown */}
                        <div className="relative">
                            <select 
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg pl-8 pr-8 py-2 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer w-32 md:w-auto"
                            >
                                <option value="Todos">Todos</option>
                                <option value="Pendiente">Pendiente</option>
                                <option value="En Progreso">En Progreso</option>
                                <option value="Completada">Completada</option>
                                <option value="Cancelada">Cancelada</option>
                            </select>
                            <Filter size={14} className="absolute left-2.5 top-3 text-slate-400 pointer-events-none"/>
                        </div>

                        {/* Date Filter Indicator / Clear Button */}
                        {selectedDate && (
                             <button 
                                onClick={() => setSelectedDate(null)}
                                className="flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                             >
                                 <span className="hidden sm:inline">Día: {selectedDate.getDate()}</span>
                                 <X size={14} />
                             </button>
                        )}

                        <a href="#/activities" className="hidden sm:block text-sm font-medium text-blue-600 hover:underline ml-2">Ver Todo</a>
                    </div>
                </div>
                
                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                    {displayList.length > 0 ? displayList.map(act => (
                        <div key={act.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`w-2 h-2 rounded-full ${
                                        act.status === 'Pendiente' ? 'bg-blue-500' :
                                        act.status === 'En Progreso' ? 'bg-orange-500' :
                                        'bg-green-500'
                                    }`}></span>
                                    <h4 className="font-bold text-slate-800 text-sm">{act.name}</h4>
                                    <span className="text-xs text-slate-400">| {act.startDate}</span>
                                </div>
                                <p className="text-xs text-slate-500 line-clamp-1 ml-4">{act.description}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                                        act.status === 'Pendiente' ? 'bg-blue-100 text-blue-600' :
                                        act.status === 'En Progreso' ? 'bg-orange-100 text-orange-600' :
                                        'bg-green-100 text-green-600'
                                    }`}>{act.status}</span>
                                <button 
                                    onClick={() => setViewActivity(act)}
                                    title="Ver detalles"
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                >
                                    <Eye size={18} />
                                </button>
                            </div>
                        </div>
                    )) : (
                        <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center">
                            <Clock size={32} className="mb-2 opacity-20"/>
                            <p>No hay actividades para los filtros seleccionados.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Visual Calendar */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                     <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white rounded-md transition-shadow text-slate-500"><ChevronLeft size={18}/></button>
                     <h3 className="font-bold text-slate-700 capitalize">
                         {currentCalendarDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                     </h3>
                     <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white rounded-md transition-shadow text-slate-500"><ChevronRight size={18}/></button>
                </div>
                
                <div className="p-4">
                    <div className="grid grid-cols-7 mb-2 text-center">
                         {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(d => (
                             <span key={d} className="text-xs font-bold text-slate-400">{d}</span>
                         ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: startDay }).map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square"></div>
                        ))}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const dayActivities = getActivitiesForDay(day);
                            const hasActivity = dayActivities.length > 0;
                            
                            // Check if this day is selected
                            const isSelected = selectedDate && 
                                               selectedDate.getDate() === day && 
                                               selectedDate.getMonth() === currentCalendarDate.getMonth() &&
                                               selectedDate.getFullYear() === currentCalendarDate.getFullYear();

                            // Determine style based on filtered status
                            let bgClass = 'bg-white text-slate-500 hover:bg-slate-50 border border-transparent';
                            
                            if (hasActivity) {
                                if (dayActivities.some(a => a.status === 'En Progreso')) {
                                    bgClass = 'bg-orange-100 text-orange-700 font-bold border border-orange-200';
                                } else if (dayActivities.some(a => a.status === 'Pendiente')) {
                                    bgClass = 'bg-blue-100 text-blue-700 font-bold border border-blue-200';
                                } else if (dayActivities.some(a => a.status === 'Completada')) {
                                    bgClass = 'bg-green-100 text-green-700 font-bold border border-green-200';
                                }
                            }

                            // Selection styling overlay
                            const ringClass = isSelected ? 'ring-2 ring-blue-500 ring-offset-1 z-10' : '';

                            return (
                                <button 
                                    key={day} 
                                    onClick={() => handleDayClick(day)}
                                    className={`aspect-square flex items-center justify-center rounded-lg transition-all text-xs ${bgClass} ${ringClass}`}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-[10px] text-slate-500 justify-center">
                        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-200"></span> Pendiente</div>
                        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-100 border border-orange-200"></span> En Progreso</div>
                        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-200"></span> Completada</div>
                    </div>
                </div>
            </div>

      </div>

      {/* Activity Detail Modal */}
      {viewActivity && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-fade-in overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <CalIcon size={20} className="text-blue-600"/> Detalle de Actividad
                    </h3>
                    <button onClick={() => setViewActivity(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={24}/>
                    </button>
                </div>
                <div className="p-6 space-y-6">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Actividad</label>
                        <p className="text-slate-800 font-bold text-lg mt-1">{viewActivity.name}</p>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Descripción</label>
                        <div className="bg-slate-50 p-3 rounded-lg mt-1 border border-slate-100">
                             <p className="text-slate-700 text-sm whitespace-pre-wrap">{viewActivity.description}</p>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Fecha Inicio</label>
                            <p className="text-slate-800 text-sm font-medium mt-1">{viewActivity.startDate}</p>
                         </div>
                         <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Fecha Término</label>
                            <p className="text-slate-800 text-sm font-medium mt-1">{viewActivity.endDate}</p>
                         </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Estado</label>
                            <span className={`inline-flex items-center gap-1.5 mt-1 px-3 py-1 rounded-full text-xs font-bold ${
                                viewActivity.status === 'Pendiente' ? 'bg-blue-100 text-blue-700' :
                                viewActivity.status === 'En Progreso' ? 'bg-orange-100 text-orange-700' :
                                'bg-green-100 text-green-700'
                            }`}>
                                <span className={`w-2 h-2 rounded-full ${
                                    viewActivity.status === 'Pendiente' ? 'bg-blue-500' :
                                    viewActivity.status === 'En Progreso' ? 'bg-orange-500' :
                                    'bg-green-500'
                                }`}></span>
                                {viewActivity.status}
                            </span>
                         </div>
                         <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Encargado</label>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                    {getUserName(viewActivity.assigneeId).charAt(0)}
                                </div>
                                <p className="text-slate-800 text-sm">{getUserName(viewActivity.assigneeId)}</p>
                            </div>
                         </div>
                     </div>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
                    <button onClick={() => setViewActivity(null)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 hover:text-slate-800 font-medium text-sm transition-colors">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
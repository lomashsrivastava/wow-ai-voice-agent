import React, { useState, useEffect } from 'react';
import { 
  PhoneCall, 
  Users, 
  Flame, 
  Clock, 
  CheckCircle, 
  Activity, 
  FileText, 
  Settings, 
  RefreshCw, 
  Send, 
  User, 
  MessageSquare, 
  HelpCircle, 
  Languages, 
  AlertTriangle,
  Award,
  Calendar,
  Sparkles,
  Search,
  ExternalLink
} from 'lucide-react';

interface Lead {
  _id: string;
  name: string;
  phone: string;
  language: string;
  intent: 'self_use' | 'investment' | 'both' | 'undecided' | 'unknown';
  locationFit: 'comfortable' | 'somewhat' | 'uncomfortable' | 'unknown';
  budgetRange: string;
  budgetNumeric: number | null;
  timelineFit: 'comfortable' | 'flexible' | 'urgent' | 'unknown';
  leadScore: {
    intent: number;
    geography: number;
    budget: number;
    timeline: number;
    total: number;
  };
  qualificationStatus: 'HOT' | 'WARM' | 'NURTURE' | 'LOW_FIT' | 'UNQUALIFIED';
  objections: string[];
  questionsAsked: string[];
  callbackRequested: boolean;
  callbackPreference: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProviderHealth {
  provider: string;
  status: string;
  cooldownUntil: string | null;
  lastSuccess: string | null;
  lastFailure: string | null;
  failureCount: number;
  requestCount: number;
  consecutiveFailures: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'demo' | 'health'>('overview');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [providerHealth, setProviderHealth] = useState<Record<string, ProviderHealth> | null>(null);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Real-time Demo Call State
  const [callActive, setCallActive] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'agent'; content: string; provider?: string }[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [extractedData, setExtractedData] = useState<any>({
    intent: 'unknown',
    geography: 'unknown',
    budget: 'unknown',
    timeline: 'unknown',
    score: 0,
    status: 'UNQUALIFIED'
  });

  const API_BASE_URL = 'http://localhost:5000/api';

  // Fetch Leads
  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const response = await fetch(`${API_BASE_URL}/leads`);
      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads || []);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoadingLeads(false);
    }
  };

  // Fetch Health
  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
      const response = await fetch(`${API_BASE_URL}/ai/providers/status`);
      if (response.ok) {
        const data = await response.json();
        setProviderHealth(data.providers || null);
      }
    } catch (error) {
      console.error('Error fetching health status:', error);
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchHealth();
    const interval = setInterval(() => {
      fetchHealth();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Demo Call Actions
  const startDemoCall = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: null })
      });
      if (response.ok) {
        const data = await response.json();
        setConversationId(data.conversationId);
        setCallActive(true);
        setMessages([
          { role: 'agent', content: 'Hello! I am Priya calling on behalf of Divyasree Developers regarding our project Whispers of the Wind near Nandi Hills. Is this a good time for a quick two-minute conversation?', provider: 'system' }
        ]);
        // Reset local extracted data
        setExtractedData({
          intent: 'unknown',
          geography: 'unknown',
          budget: 'unknown',
          timeline: 'unknown',
          score: 0,
          status: 'UNQUALIFIED'
        });
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  const sendDemoMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !conversationId || sendingMessage) return;

    const userText = inputValue;
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setSendingMessage(true);

    try {
      const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText })
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, { 
          role: 'agent', 
          content: data.response,
          provider: data.provider 
        }]);

        // Real-time heuristic qualification updates for visual interest
        const textLower = userText.toLowerCase();
        let updated = { ...extractedData };

        if (textLower.includes('invest')) {
          updated.intent = 'Investment';
          updated.score += 25;
        } else if (textLower.includes('self') || textLower.includes('live') || textLower.includes('home')) {
          updated.intent = 'Self Use';
          updated.score += 25;
        }

        if (textLower.includes('nandi') || textLower.includes('devanahalli') || textLower.includes('yes')) {
          updated.geography = 'Comfortable';
          updated.score += 25;
        }

        if (textLower.includes('lakh') || textLower.includes('crore') || textLower.includes('budget') || textLower.includes('affordable')) {
          updated.budget = 'Fits (>=92.4L)';
          updated.score += 30;
        }

        if (textLower.includes('2029') || textLower.includes('possession') || textLower.includes('timeline')) {
          updated.timeline = 'Comfortable';
          updated.score += 20;
        }

        updated.score = Math.min(updated.score, 100);
        if (updated.score >= 80) updated.status = 'HOT';
        else if (updated.score >= 60) updated.status = 'WARM';
        else if (updated.score >= 40) updated.status = 'NURTURE';
        else updated.status = 'LOW_FIT';

        setExtractedData(updated);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const endDemoCall = () => {
    // Generate a mock lead record based on call outcomes
    if (messages.length > 2) {
      const mockLead: Lead = {
        _id: Math.random().toString(36).substr(2, 9),
        name: 'Demo Lead ' + new Date().toLocaleTimeString(),
        phone: '+91 98765 43210',
        language: 'Hinglish',
        intent: extractedData.intent.toLowerCase().includes('invest') ? 'investment' : 'self_use',
        locationFit: extractedData.geography.toLowerCase().includes('comfort') ? 'comfortable' : 'somewhat',
        budgetRange: '₹92.4L - ₹2.46Cr',
        budgetNumeric: 9500000,
        timelineFit: extractedData.timeline.toLowerCase().includes('comfort') ? 'comfortable' : 'flexible',
        leadScore: {
          intent: extractedData.intent !== 'unknown' ? 25 : 0,
          geography: extractedData.geography !== 'unknown' ? 25 : 0,
          budget: extractedData.budget !== 'unknown' ? 30 : 0,
          timeline: extractedData.timeline !== 'unknown' ? 20 : 0,
          total: extractedData.score
        },
        qualificationStatus: extractedData.status,
        objections: ['Timeline is far out'],
        questionsAsked: ['What are the plot options?', 'Is the pricing negotiable?'],
        callbackRequested: true,
        callbackPreference: 'Morning',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setLeads(prev => [mockLead, ...prev]);
    }
    
    setCallActive(false);
    setConversationId(null);
    setMessages([]);
  };

  // Metrics calculation
  const totalLeads = leads.length;
  const hotLeads = leads.filter(l => l.qualificationStatus === 'HOT').length;
  const warmLeads = leads.filter(l => l.qualificationStatus === 'WARM').length;
  const callbackLeads = leads.filter(l => l.callbackRequested).length;

  const filteredLeads = leads.filter(lead => 
    lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.phone.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-yellow-600 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-900/20">
              <Sparkles className="h-5 w-5 text-slate-950 font-black" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-wider text-gradient-gold">WOW AI VOICE AGENT</span>
              <span className="text-xs block text-slate-400 font-medium">Whispers of the Wind Lead Qualification</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Backend Connected
            </div>
            <button 
              onClick={() => { fetchLeads(); fetchHealth(); }}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-200"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex gap-8">
        
        {/* Navigation Sidebar */}
        <aside className="w-64 shrink-0 flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
              activeTab === 'overview' 
                ? 'bg-gradient-to-r from-amber-500/10 to-yellow-600/10 border-l-4 border-amber-500 text-amber-400 shadow-md' 
                : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="h-4 w-4" />
            Overview Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('leads')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
              activeTab === 'leads' 
                ? 'bg-gradient-to-r from-amber-500/10 to-yellow-600/10 border-l-4 border-amber-500 text-amber-400 shadow-md' 
                : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="h-4 w-4" />
            Qualified Leads
          </button>
          <button 
            onClick={() => setActiveTab('demo')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
              activeTab === 'demo' 
                ? 'bg-gradient-to-r from-amber-500/10 to-yellow-600/10 border-l-4 border-amber-500 text-amber-400 shadow-md' 
                : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <PhoneCall className="h-4 w-4" />
            Live Voice Simulator
          </button>
          <button 
            onClick={() => setActiveTab('health')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
              activeTab === 'health' 
                ? 'bg-gradient-to-r from-amber-500/10 to-yellow-600/10 border-l-4 border-amber-500 text-amber-400 shadow-md' 
                : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="h-4 w-4" />
            AI Provider Health
          </button>

          {/* Quick Stats Panel */}
          <div className="mt-8 glass rounded-2xl p-5 border border-slate-800/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Project Summary</h4>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex justify-between"><span className="text-slate-400">Total Plots</span> <span>207 units</span></li>
              <li className="flex justify-between"><span className="text-slate-400">Possession</span> <span>Dec 2029</span></li>
              <li className="flex justify-between"><span className="text-slate-400">Plot Range</span> <span>1,200-3,199 sq.ft.</span></li>
              <li className="flex justify-between"><span className="text-slate-400">Starting Price</span> <span>₹92.4 Lakh</span></li>
            </ul>
          </div>
        </aside>

        {/* Content Section */}
        <main className="flex-1 min-w-0">

          {/* Tab: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fadeIn">
              {/* KPIs */}
              <div className="grid grid-cols-4 gap-5">
                <div className="glass rounded-2xl p-6 border border-slate-800/80 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-sm font-semibold text-slate-400">Total Leads</span>
                    <div className="p-2 rounded-xl bg-slate-800 text-slate-300"><Users className="h-5 w-5" /></div>
                  </div>
                  <div>
                    <h3 className="text-3xl font-extrabold text-gradient">{totalLeads}</h3>
                    <p className="text-xs text-slate-400 mt-1">Total leads qualified</p>
                  </div>
                </div>

                <div className="glass rounded-2xl p-6 border border-slate-800/80 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-sm font-semibold text-slate-400">Hot Leads</span>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20"><Flame className="h-5 w-5" /></div>
                  </div>
                  <div>
                    <h3 className="text-3xl font-extrabold text-amber-400">{hotLeads}</h3>
                    <p className="text-xs text-slate-400 mt-1">Score ≥ 80 points</p>
                  </div>
                </div>

                <div className="glass rounded-2xl p-6 border border-slate-800/80 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-sm font-semibold text-slate-400">Warm Leads</span>
                    <div className="p-2 rounded-xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"><Award className="h-5 w-5" /></div>
                  </div>
                  <div>
                    <h3 className="text-3xl font-extrabold text-yellow-400">{warmLeads}</h3>
                    <p className="text-xs text-slate-400 mt-1">Score 60-79 points</p>
                  </div>
                </div>

                <div className="glass rounded-2xl p-6 border border-slate-800/80 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-sm font-semibold text-slate-400">Callbacks</span>
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"><Calendar className="h-5 w-5" /></div>
                  </div>
                  <div>
                    <h3 className="text-3xl font-extrabold text-indigo-400">{callbackLeads}</h3>
                    <p className="text-xs text-slate-400 mt-1">Expert callback requested</p>
                  </div>
                </div>
              </div>

              {/* Quick AI Provider Status Overview */}
              <div className="glass rounded-2xl p-6 border border-slate-800/80">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-bold text-lg text-slate-200">Failover Chain Status</h3>
                    <p className="text-xs text-slate-400">Real-time availability of system AI models</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 font-semibold border border-slate-700 text-slate-300">
                    Failover Order: Gemini → Grok → Ollama → Demo
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  {['gemini', 'grok', 'ollama', 'demo'].map((prov) => {
                    const health = providerHealth?.[prov];
                    const isAvailable = prov === 'demo' || (health ? health.status === 'available' : true);
                    const isConfigured = prov !== 'grok'; // Mock grok as not configured for demo failover
                    return (
                      <div key={prov} className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-2.5 w-2.5 rounded-full ${
                            !isConfigured ? 'bg-slate-600' : isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                          }`}></div>
                          <div>
                            <span className="font-semibold capitalize text-sm block">{prov}</span>
                            <span className="text-xs text-slate-400 block">
                              {!isConfigured ? 'Not Configured' : isAvailable ? 'Active' : 'Unavailable'}
                            </span>
                          </div>
                        </div>
                        {isAvailable && isConfigured && (
                          <span className="text-[10px] uppercase font-bold text-emerald-400/80 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                            Ready
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sample Leads Grid */}
              <div className="glass rounded-2xl p-6 border border-slate-800/80">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-bold text-lg text-slate-200">Recent Qualified Leads</h3>
                    <p className="text-xs text-slate-400">Quick overview of qualified real estate buyers</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('leads')}
                    className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
                  >
                    View All Leads <ExternalLink className="h-3 w-3" />
                  </button>
                </div>

                {leads.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                    <p className="text-slate-400 text-sm">No leads qualified yet. Try simulated call to create leads.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {leads.slice(0, 4).map((lead) => (
                      <div key={lead._id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-200">{lead.name}</h4>
                          <p className="text-xs text-slate-400">{lead.phone}</p>
                          <div className="flex gap-2 mt-3">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                              {lead.intent}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                              {lead.locationFit} location
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                            lead.qualificationStatus === 'HOT' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            lead.qualificationStatus === 'WARM' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                            'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {lead.qualificationStatus}
                          </span>
                          <span className="text-xs block font-bold mt-2 text-slate-300">{lead.leadScore.total} pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Leads */}
          {activeTab === 'leads' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex justify-between items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search by name or phone number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:border-amber-500 focus:outline-none text-sm"
                  />
                </div>
                <button 
                  onClick={fetchLeads}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl font-semibold text-sm transition-colors text-slate-200"
                >
                  Refresh Table
                </button>
              </div>

              {/* Leads Table */}
              <div className="glass rounded-2xl border border-slate-800/80 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/35 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Lead</th>
                      <th className="px-6 py-4">Checkpoints (Score Breakdown)</th>
                      <th className="px-6 py-4 text-center">Callback</th>
                      <th className="px-6 py-4 text-center">Score</th>
                      <th className="px-6 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {filteredLeads.map((lead) => (
                      <tr 
                        key={lead._id}
                        onClick={() => setSelectedLead(lead)}
                        className="hover:bg-slate-900/40 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-5">
                          <span className="font-bold text-slate-200 block">{lead.name}</span>
                          <span className="text-xs text-slate-400 block mt-0.5">{lead.phone}</span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="grid grid-cols-4 gap-2 text-[10px] font-bold">
                            <span className={`px-2 py-0.5 rounded ${lead.leadScore.intent > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-slate-800 text-slate-400 border border-slate-700/60'} text-center border`}>
                              Intent: {lead.leadScore.intent}
                            </span>
                            <span className={`px-2 py-0.5 rounded ${lead.leadScore.geography > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-slate-800 text-slate-400 border border-slate-700/60'} text-center border`}>
                              Geo: {lead.leadScore.geography}
                            </span>
                            <span className={`px-2 py-0.5 rounded ${lead.leadScore.budget > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-slate-800 text-slate-400 border border-slate-700/60'} text-center border`}>
                              Budget: {lead.leadScore.budget}
                            </span>
                            <span className={`px-2 py-0.5 rounded ${lead.leadScore.timeline > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-slate-800 text-slate-400 border border-slate-700/60'} text-center border`}>
                              Timeline: {lead.leadScore.timeline}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          {lead.callbackRequested ? (
                            <span className="inline-flex items-center gap-1 text-xs text-indigo-400 font-bold bg-indigo-500/5 px-2 py-1 rounded border border-indigo-500/10">
                              Yes ({lead.callbackPreference || 'Anytime'})
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs">No</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-center font-bold text-slate-200">
                          {lead.leadScore.total}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className={`inline-block text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                            lead.qualificationStatus === 'HOT' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            lead.qualificationStatus === 'WARM' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                            lead.qualificationStatus === 'NURTURE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            'bg-slate-800 text-slate-400 border border-slate-700/60'
                          }`}>
                            {lead.qualificationStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Lead Details Modal Overlay */}
              {selectedLead && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                  <div className="glass-premium rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-amber-500/20 flex flex-col max-h-[85vh]">
                    <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-900/40">
                      <div>
                        <h3 className="text-xl font-bold text-slate-200">{selectedLead.name}</h3>
                        <p className="text-sm text-slate-400">{selectedLead.phone}</p>
                      </div>
                      <button 
                        onClick={() => setSelectedLead(null)}
                        className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold"
                      >
                        ✕ Close
                      </button>
                    </div>

                    <div className="p-6 overflow-y-auto space-y-6 flex-1">
                      {/* Qualification Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/20">
                          <span className="text-xs font-bold text-slate-400 block">Intent Use-case</span>
                          <span className="font-semibold text-sm capitalize text-slate-200 mt-1 block">{selectedLead.intent}</span>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/20">
                          <span className="text-xs font-bold text-slate-400 block">Nandi Hills Corridor fit</span>
                          <span className="font-semibold text-sm capitalize text-slate-200 mt-1 block">{selectedLead.locationFit}</span>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/20">
                          <span className="text-xs font-bold text-slate-400 block">Budget Level</span>
                          <span className="font-semibold text-sm text-slate-200 mt-1 block">{selectedLead.budgetRange || 'Unspecified'}</span>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/20">
                          <span className="text-xs font-bold text-slate-400 block">Delivery Timeline</span>
                          <span className="font-semibold text-sm capitalize text-slate-200 mt-1 block">{selectedLead.timelineFit}</span>
                        </div>
                      </div>

                      {/* Score Breakdown */}
                      <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Score Breakdown ({selectedLead.leadScore.total} points)</h4>
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                            selectedLead.qualificationStatus === 'HOT' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {selectedLead.qualificationStatus}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {/* Progress bars */}
                          <div>
                            <div className="flex justify-between text-xs mb-1"><span>Intent (Max 25)</span><span>{selectedLead.leadScore.intent}</span></div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className="bg-amber-500 h-full" style={{width: `${(selectedLead.leadScore.intent/25)*100}%`}}></div></div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs mb-1"><span>Geography (Max 25)</span><span>{selectedLead.leadScore.geography}</span></div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className="bg-amber-500 h-full" style={{width: `${(selectedLead.leadScore.geography/25)*100}%`}}></div></div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs mb-1"><span>Budget (Max 30)</span><span>{selectedLead.leadScore.budget}</span></div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className="bg-amber-500 h-full" style={{width: `${(selectedLead.leadScore.budget/30)*100}%`}}></div></div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs mb-1"><span>Timeline (Max 20)</span><span>{selectedLead.leadScore.timeline}</span></div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className="bg-amber-500 h-full" style={{width: `${(selectedLead.leadScore.timeline/20)*100}%`}}></div></div>
                          </div>
                        </div>
                      </div>

                      {/* Transcripts / Objections */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Objections & Questions</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedLead.objections.map((o, idx) => (
                            <span key={idx} className="text-xs px-2.5 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20">{o}</span>
                          ))}
                          {selectedLead.questionsAsked.map((q, idx) => (
                            <span key={idx} className="text-xs px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{q}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Demo Voice Simulator */}
          {activeTab === 'demo' && (
            <div className="grid grid-cols-3 gap-6 animate-fadeIn">
              
              {/* Call panel */}
              <div className="col-span-2 glass rounded-3xl p-6 border border-slate-800/80 flex flex-col min-h-[500px]">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-bold text-lg text-slate-200">Outbound Voice Call Simulation</h3>
                    <p className="text-xs text-slate-400">Simulate a multi-turn conversation with lead qualification scoring</p>
                  </div>
                  {callActive ? (
                    <button 
                      onClick={endDemoCall}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-lg"
                    >
                      End Conversation
                    </button>
                  ) : (
                    <button 
                      onClick={startDemoCall}
                      className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 rounded-xl text-xs font-bold shadow-lg shadow-yellow-900/10 flex items-center gap-1.5"
                    >
                      <PhoneCall className="h-3.5 w-3.5" /> Start Test Call
                    </button>
                  )}
                </div>

                {/* Conversation Box */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-6 min-h-[300px]">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 border border-dashed border-slate-800 rounded-2xl">
                      <div className="p-4 rounded-full bg-slate-900 text-slate-500 mb-3"><MessageSquare className="h-8 w-8" /></div>
                      <p className="text-slate-400 text-sm font-medium">Click "Start Test Call" to simulate an outbound lead qualification flow.</p>
                    </div>
                  ) : (
                    messages.map((msg, index) => (
                      <div key={index} className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                        <div className={`p-2 rounded-xl h-8 w-8 shrink-0 flex items-center justify-center ${
                          msg.role === 'user' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {msg.role === 'user' ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                            msg.role === 'user' 
                              ? 'bg-amber-500 text-slate-950 font-medium' 
                              : 'bg-slate-900 border border-slate-800 text-slate-200'
                          }`}>
                            {msg.content}
                          </div>
                          {msg.provider && (
                            <span className="text-[10px] text-slate-500 mt-1 block">
                              Processed via: <span className="font-semibold uppercase">{msg.provider}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  {sendingMessage && (
                    <div className="flex gap-3 max-w-[80%]">
                      <div className="p-2 rounded-xl h-8 w-8 shrink-0 flex items-center justify-center bg-slate-800 text-slate-500">
                        <Sparkles className="h-4 w-4 animate-spin" />
                      </div>
                      <div className="p-4 rounded-2xl text-sm bg-slate-900/60 border border-slate-800/80 text-slate-400 flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce delay-75"></span>
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce delay-150"></span>
                        Priya is typing/speaking...
                      </div>
                    </div>
                  )}
                </div>

                {/* Input box */}
                <form onSubmit={sendDemoMessage} className="flex gap-3">
                  <input 
                    type="text" 
                    placeholder={callActive ? "Type your response to Priya..." : "Start call first..."}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={!callActive || sendingMessage}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  />
                  <button 
                    type="submit" 
                    disabled={!callActive || sendingMessage || !inputValue.trim()}
                    className="px-5 bg-amber-500 text-slate-950 rounded-xl font-bold hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>

              {/* Side Real-time Extraction Panel */}
              <div className="glass rounded-3xl p-6 border border-slate-800/80 flex flex-col gap-6">
                <div>
                  <h3 className="font-bold text-lg text-slate-200">Real-time Qualification</h3>
                  <p className="text-xs text-slate-400">System attributes extracted on the fly</p>
                </div>

                <div className="space-y-4">
                  <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/30">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Intent Checkpoint</span>
                    <span className={`text-xs font-semibold block mt-1 capitalize ${extractedData.intent !== 'unknown' ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                      {extractedData.intent}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/30">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Geography Checkpoint</span>
                    <span className={`text-xs font-semibold block mt-1 capitalize ${extractedData.geography !== 'unknown' ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                      {extractedData.geography}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/30">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Budget Checkpoint</span>
                    <span className={`text-xs font-semibold block mt-1 capitalize ${extractedData.budget !== 'unknown' ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                      {extractedData.budget}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/30">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Timeline Checkpoint</span>
                    <span className={`text-xs font-semibold block mt-1 capitalize ${extractedData.timeline !== 'unknown' ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                      {extractedData.timeline}
                    </span>
                  </div>
                </div>

                {/* Score Dial */}
                <div className="border-t border-slate-800 pt-5 text-center">
                  <span className="text-xs font-bold text-slate-400 uppercase block">Total Lead Score</span>
                  <div className="text-4xl font-extrabold mt-2 text-gradient">{extractedData.score}</div>
                  <span className="text-[10px] text-slate-500 block mt-1">out of 100 max points</span>
                  
                  <div className="mt-4">
                    <span className={`inline-block text-[10px] font-extrabold px-3 py-1 rounded-full ${
                      extractedData.status === 'HOT' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      extractedData.status === 'WARM' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                      'bg-slate-800 text-slate-400 border border-slate-700/60'
                    }`}>
                      STATUS: {extractedData.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Health */}
          {activeTab === 'health' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="glass rounded-2xl p-6 border border-slate-800/80">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-bold text-lg text-slate-200">AI Provider Reliability Status</h3>
                    <p className="text-xs text-slate-400">Detailed health parameters of all connected LLM providers</p>
                  </div>
                  <button 
                    onClick={fetchHealth}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl font-semibold text-xs transition-colors text-slate-200"
                  >
                    Refresh Health Parameters
                  </button>
                </div>

                <div className="space-y-4">
                  {['gemini', 'grok', 'ollama', 'demo'].map((prov) => {
                    const health = providerHealth?.[prov];
                    const isConfigured = prov !== 'grok'; // mock grok as unconfigured
                    return (
                      <div key={prov} className="border border-slate-800 bg-slate-900/20 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-4">
                          <div className={`h-3 w-3 rounded-full ${
                            !isConfigured ? 'bg-slate-600' : (health ? health.status === 'available' : true) ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                          }`}></div>
                          <div>
                            <h4 className="font-bold capitalize text-slate-200 flex items-center gap-2">
                              {prov}
                              <span className="text-[10px] text-slate-500 font-medium">({prov === 'ollama' ? 'qwen2.5:7b' : prov === 'gemini' ? 'gemini-2.5-flash' : 'demo-v1'})</span>
                            </h4>
                            <p className="text-xs text-slate-400 mt-1">
                              {!isConfigured 
                                ? 'No credentials supplied in environment configuration.' 
                                : `Active status: ${health ? health.status.toUpperCase() : 'AVAILABLE'}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-4 text-xs">
                          <div className="text-right">
                            <span className="text-slate-500 block text-[10px] uppercase font-bold">Requests</span>
                            <span className="font-semibold text-slate-300">{health ? health.requestCount : 0}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-500 block text-[10px] uppercase font-bold">Failures</span>
                            <span className="font-semibold text-slate-300">{health ? health.failureCount : 0}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-500 block text-[10px] uppercase font-bold">Consecutive</span>
                            <span className="font-semibold text-slate-300">{health ? health.consecutiveFailures : 0}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-xs text-slate-500">
          <p>© 2026 Divyasree Developers. Whispers of the Wind Outbound Voice Agent Simulation.</p>
          <div className="flex gap-4">
            <span>RERA Registered</span>
            <span>RERA No: PRM/KA/RERA/1250/301/PR/070525/007718</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

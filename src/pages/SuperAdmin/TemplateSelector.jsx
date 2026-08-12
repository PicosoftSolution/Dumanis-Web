import React, { useState } from 'react';
import { Search, X, Eye, Copy, FileText, Building, Home, Factory, School, TreePine, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

const TEMPLATES = [
  // Commercial Templates
  { id: 'commercial-1', name: 'Customer Feedback', category: 'commercial', icon: '🏢', description: 'Collects feedback on product or service experience', type: 'Survey', industry: 'Customer Service', questions: 12 },
  { id: 'commercial-2', name: 'Employee Feedback', category: 'commercial', icon: '👥', description: 'Measures satisfaction, motivation, and morale', type: 'Survey', industry: 'IT', questions: 15 },
  { id: 'commercial-3', name: 'Product Feature Poll', category: 'commercial', icon: '⭐', description: 'Product Feature preference collection', type: 'Poll', industry: 'IT', questions: 8 },
  { id: 'commercial-4', name: 'Preferred Work Model', category: 'commercial', icon: '💼', description: 'Employee Preferred Work Model', type: 'Poll', industry: 'IT', questions: 6 },
  { id: 'commercial-5', name: 'Team Outing Preference', category: 'commercial', icon: '🎉', description: 'Team Outing Preference', type: 'Poll', industry: 'IT', questions: 5 },
  { id: 'commercial-6', name: 'Onboarding Compliance', category: 'commercial', icon: '📋', description: 'Onboarding Compliance Quiz', type: 'Quiz', industry: 'HR', questions: 20 },
  { id: 'commercial-7', name: 'Job Application Form', category: 'commercial', icon: '📝', description: 'Collects candidate details and qualifications', type: 'Application', industry: 'HR', questions: 18 },

  // Industrial Templates
  { id: 'industrial-1', name: 'Industrial Safety Audit', category: 'industrial', icon: '🏭', description: 'Safety compliance and hazard assessment', type: 'Survey', industry: 'Manufacturing', questions: 25 },
  { id: 'industrial-2', name: 'Equipment Maintenance', category: 'industrial', icon: '🔧', description: 'Equipment maintenance and performance tracking', type: 'Survey', industry: 'Maintenance', questions: 20 },
  { id: 'industrial-3', name: 'Worker Satisfaction', category: 'industrial', icon: '👷', description: 'Worker satisfaction and workplace conditions', type: 'Survey', industry: 'HR', questions: 15 },

  // Residential Templates
  { id: 'residential-1', name: 'Resident Satisfaction', category: 'residential', icon: '🏠', description: 'Resident satisfaction with amenities and services', type: 'Survey', industry: 'Housing', questions: 20 },
  { id: 'residential-2', name: 'Maintenance Request', category: 'residential', icon: '🔨', description: 'Report maintenance issues and requests', type: 'Application', industry: 'Facility', questions: 10 },
  { id: 'residential-3', name: 'Community Event', category: 'residential', icon: '🎪', description: 'Community event registration and interest', type: 'Application', industry: 'Community', questions: 8 },

  // Institutional Templates
  { id: 'institutional-1', name: 'Course Evaluation', category: 'institutional', icon: '🏫', description: 'Captures student feedback on training or education', type: 'Survey', industry: 'Education', questions: 15 },
  { id: 'institutional-2', name: 'College Admission Form', category: 'institutional', icon: '🎓', description: 'College admission application', type: 'Application', industry: 'Education', questions: 25 },
  { id: 'institutional-3', name: 'Faculty Evaluation', category: 'institutional', icon: '👨‍🏫', description: 'Evaluate professors based on clarity, engagement', type: 'Survey', industry: 'Education', questions: 12 },
  { id: 'institutional-4', name: 'Campus Facilities', category: 'institutional', icon: '🏛️', description: 'Satisfaction with libraries, labs, hostels', type: 'Survey', industry: 'Education', questions: 18 },
  { id: 'institutional-5', name: 'Career Services Feedback', category: 'institutional', icon: '💼', description: 'Assess placement support and internships', type: 'Survey', industry: 'Education', questions: 10 },
  { id: 'institutional-6', name: 'Mental Health & Wellness', category: 'institutional', icon: '🧠', description: 'Stress levels and counseling needs', type: 'Survey', industry: 'Education', questions: 14 },
  { id: 'institutional-7', name: 'Guest Lecture Interest', category: 'institutional', icon: '🎙️', description: 'Topics for external speakers', type: 'Poll', industry: 'Education', questions: 6 },
  { id: 'institutional-8', name: 'Aptitude & Reasoning', category: 'institutional', icon: '🧩', description: 'Prepare students for campus placements', type: 'Quiz', industry: 'Education', questions: 30 },
  { id: 'institutional-9', name: 'Subject-Specific Quiz', category: 'institutional', icon: '📚', description: 'Academic reinforcement quizzes', type: 'Quiz', industry: 'Education', questions: 25 },
  { id: 'institutional-10', name: 'Maths Quiz', category: 'institutional', icon: '➗', description: 'Maths with Algebra, Trigonometry, Geometry', type: 'Quiz', industry: 'Education', questions: 20 },
  { id: 'institutional-11', name: 'General Knowledge Quiz', category: 'institutional', icon: '🌍', description: 'General Knowledge for students', type: 'Quiz', industry: 'Education', questions: 25 },
  { id: 'institutional-12', name: 'Kids Quiz', category: 'institutional', icon: '🧸', description: 'Quiz for kids to test knowledge', type: 'Quiz', industry: 'Education', questions: 15 },

  // Open Site Templates
  { id: 'opensite-1', name: 'Public Feedback', category: 'opensite', icon: '🌳', description: 'Gather feedback from public about facilities', type: 'Survey', industry: 'Public', questions: 12 },
  { id: 'opensite-2', name: 'Event Registration', category: 'opensite', icon: '🎫', description: 'Event registration form', type: 'Application', industry: 'Events', questions: 10 },

  // Apartment Templates
  { id: 'apartment-1', name: 'Apartment Survey', category: 'apartment', icon: '🏘️', description: 'Resident satisfaction and feedback', type: 'Survey', industry: 'Housing', questions: 18 },
  { id: 'apartment-2', name: 'Facility Request', category: 'apartment', icon: '🔑', description: 'Request for facilities and services', type: 'Application', industry: 'Facility', questions: 8 }
];

const CATEGORIES = [
  { value: 'all', label: 'All Templates', icon: '📋' },
  { value: 'commercial', label: 'Commercial', icon: '🏢' },
  { value: 'industrial', label: 'Industrial', icon: '🏭' },
  { value: 'residential', label: 'Residential', icon: '🏠' },
  { value: 'institutional', label: 'Institutional', icon: '🏫' },
  { value: 'opensite', label: 'Open Site', icon: '🌳' },
  { value: 'apartment', label: 'Apartment', icon: '🏘️' }
];

export default function TemplateSelector({ onSelect, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const filteredTemplates = TEMPLATES.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleUseTemplate = (template) => {
    setSelectedTemplate(template);
    if (window.confirm(`Create form from "${template.name}" template?`)) {
      onSelect(template);
    }
  };

  const handlePreview = (template) => {
    toast.info(`Preview for "${template.name}" - Coming soon`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">SmartForms Templates</h2>
            <p className="text-sm text-gray-500">Here You Can View And Search Your Templates</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    selectedCategory === cat.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <span className="mr-2">{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-sm text-gray-500 mb-4">
            Powered By VAapps • {filteredTemplates.length} templates found
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <div key={template.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{template.icon}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                        <div className="flex gap-2 mt-1">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{template.type}</span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{template.industry}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-3">{template.description}</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs text-gray-500">
                      <FileText className="w-3 h-3 inline mr-1" />
                      {template.questions} questions
                    </div>
                    <div className="text-xs text-gray-500">Version: 1.0</div>
                  </div>
                  
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handlePreview(template)}
                      className="flex-1 px-3 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm flex items-center justify-center gap-1"
                    >
                      <Eye className="w-4 h-4" /> Preview
                    </button>
                    <button
                      onClick={() => handleUseTemplate(template)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center justify-center gap-1"
                    >
                      <Copy className="w-4 h-4" /> Use Template
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
import { useAuth0 } from '@auth0/auth0-react';
import { Link } from 'react-router-dom';
import { Clock, Users, FileText, BarChart3, Tag, DollarSign } from 'lucide-react';

function Home() {
  const { isAuthenticated, loginWithRedirect } = useAuth0();

  return (
    <div className="py-12">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 text-balance">
          Ask & Deliver
        </h1>
        <p className="text-xl text-gray-600 mb-2">Time Tracking & Invoicing</p>
        <p className="text-lg text-gray-500 mb-8">
          Track your creative work, manage client-specific rates, and generate
          beautiful invoices with per-task discount support.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn-primary text-lg px-8 py-3">
              Go to Dashboard
            </Link>
          ) : (
            <button
              onClick={() => loginWithRedirect()}
              className="btn-primary text-lg px-8 py-3"
            >
              Get Started
            </button>
          )}
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-8 mb-16">
        <div className="card">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <Clock className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Live Timer
          </h3>
          <p className="text-gray-600">
            Start/stop timers with one click. Track time per project and task
            type with real-time counting.
          </p>
        </div>

        <div className="card">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Client Management
          </h3>
          <p className="text-gray-600">
            Manage clients with custom discount rates per task type. Different
            pricing for different clients.
          </p>
        </div>

        <div className="card">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <DollarSign className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Smart Discounts
          </h3>
          <p className="text-gray-600">
            Per-client, per-task discount system. Set 50% off design for one
            client, pro-bono strategy for another.
          </p>
        </div>

        <div className="card">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
            <Tag className="w-6 h-6 text-orange-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Task Types & Rates
          </h3>
          <p className="text-gray-600">
            Configurable task categories with individual hourly rates. Design,
            development, strategy, and more.
          </p>
        </div>

        <div className="card">
          <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-cyan-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Invoice Generation
          </h3>
          <p className="text-gray-600">
            Generate detailed invoices showing base rates, discounts, and
            effective rates. Export as CSV or PDF.
          </p>
        </div>

        <div className="card">
          <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
            <BarChart3 className="w-6 h-6 text-pink-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Reports & Export
          </h3>
          <p className="text-gray-600">
            Filter by date range, client, or project. Export timesheets and
            invoices for billing.
          </p>
        </div>
      </div>

      {/* Tech Stack */}
      <div className="card text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Built for Creative Professionals
        </h2>
        <div className="flex flex-wrap justify-center gap-4">
          {[
            'React',
            'TypeScript',
            'Tailwind CSS',
            'Express',
            'MongoDB',
            'Auth0',
          ].map((tech) => (
            <span
              key={tech}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Home;

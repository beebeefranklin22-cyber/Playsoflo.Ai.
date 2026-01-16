import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import CollaborativeEditor from '../components/collaboration/CollaborativeEditor';
import { AlertTriangle, Lock } from 'lucide-react';

export default function SharedDocument() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || window.location.pathname.split('/').pop();
  const [document, setDocument] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    validateAndLoadDocument();
    loadUser();
  }, [token]);

  const loadUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
    } catch (error) {
      // User not logged in - that's okay for shared docs
      setCurrentUser({ email: 'anonymous', full_name: 'Anonymous Viewer' });
    }
  };

  const validateAndLoadDocument = async () => {
    try {
      const { data } = await base44.functions.invoke('validateShareToken', { token });
      
      if (data.success) {
        setDocument(data.document);
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Failed to load shared document');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-effect rounded-2xl p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-950 via-fuchsia-950 to-sky-950">
      <div className="container mx-auto py-6 px-4">
        <div className="glass-effect rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 100px)' }}>
          <CollaborativeEditor
            documentId={document.id}
            currentUser={currentUser}
          />
        </div>
      </div>
    </div>
  );
}
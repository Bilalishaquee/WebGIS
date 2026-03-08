import { useState, useEffect } from 'react';
import { User, Mail, Building2, Lock, Save } from 'lucide-react';
import * as api from '../api/client';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [form, setForm] = useState({
    name: '',
    organization: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    let cancelled = false;
    api.getProfile()
      .then((data) => {
        if (!cancelled) {
          setProfile(data);
          setForm((f) => ({
            ...f,
            name: data.name ?? '',
            organization: data.organization ?? '',
          }));
        }
      })
      .catch((err) => {
        if (!cancelled) setMessage({ type: 'error', text: err.message || 'Failed to load profile' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setMessage({ type: '', text: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }
    if (form.newPassword && form.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    setSaving(true);
    try {
      const body = { name: form.name || null, organization: form.organization || null };
      if (form.newPassword) body.password = form.newPassword;
      const data = await api.updateProfile(body);
      setProfile(data);
      if (data.name) localStorage.setItem('userName', data.name);
      setForm((f) => ({ ...f, newPassword: '', confirmPassword: '' }));
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 sm:px-6 pt-6 pb-4 bg-white/90 backdrop-blur-md border-b border-gray-200/60 lg:pl-6 pl-16">
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Profile
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <span className="text-gray-500">Loading profile…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 pt-6 pb-4 bg-white/90 backdrop-blur-md border-b border-gray-200/60 lg:pl-6 pl-16 animate-fade-in">
        <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          Profile
        </h2>
        <p className="text-sm text-gray-500 mt-1">Manage your account details</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-xl mx-auto space-y-6">
          {message.text && (
            <div
              className={`p-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800'
                  : 'bg-red-50 text-red-800'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="card-gradient p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <User size={28} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{profile?.name || 'User'}</h3>
                <p className="text-sm text-gray-500">{profile?.email}</p>
              </div>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User size={18} />
                </div>
                <input
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="input-field w-full pl-10"
                  placeholder="Your name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email-display" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail size={18} />
                </div>
                <input
                  id="email-display"
                  type="text"
                  value={profile?.email ?? ''}
                  disabled
                  className="input-field w-full pl-10 bg-gray-50 text-gray-600 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed.</p>
            </div>

            <div>
              <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-1">
                Organization
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Building2 size={18} />
                </div>
                <input
                  id="organization"
                  type="text"
                  value={form.organization}
                  onChange={(e) => handleChange('organization', e.target.value)}
                  className="input-field w-full pl-10"
                  placeholder="Organization or project"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Change password</h4>
              <div className="space-y-3">
                <div>
                  <label htmlFor="newPassword" className="block text-xs text-gray-600 mb-1">
                    New password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Lock size={16} />
                    </div>
                    <input
                      id="newPassword"
                      type="password"
                      value={form.newPassword}
                      onChange={(e) => handleChange('newPassword', e.target.value)}
                      className="input-field w-full pl-10"
                      placeholder="Leave blank to keep current"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-xs text-gray-600 mb-1">
                    Confirm new password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    className="input-field w-full"
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save changes
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  MapPin,
  Building,
  Search,
  RefreshCw,
  Save,
  X
} from 'lucide-react';
import AdminAPI from '../services/api';
import { State, District, StateForm, DistrictForm } from '../types';

const States: React.FC = () => {
  const [states, setStates] = useState<State[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'states' | 'districts'>('states');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<State | District | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Loading states and districts...');
      const [statesData, districtsData] = await Promise.all([
        AdminAPI.getAllStates(),
        AdminAPI.getDistricts()
      ]);
      console.log('States API response:', statesData);
      console.log('Districts API response:', districtsData);
      setStates(statesData);
      setDistricts(districtsData);
      console.log('States set to:', statesData);
      console.log('Districts set to:', districtsData);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveState = async (data: StateForm) => {
    try {
      if (editItem && 'name' in editItem) {
        await AdminAPI.updateState(editItem._id, data);
      } else {
        await AdminAPI.createState(data);
      }
      await loadData();
      setEditModalOpen(false);
      setEditItem(null);
    } catch (err) {
      console.error('Error saving state:', err);
      alert('Failed to save state');
    }
  };

  const handleSaveDistrict = async (data: DistrictForm) => {
    try {
      if (editItem && 'state_id' in editItem) {
        await AdminAPI.updateDistrict(editItem._id, data);
      } else {
        await AdminAPI.createDistrict(data);
      }
      await loadData();
      setEditModalOpen(false);
      setEditItem(null);
    } catch (err) {
      console.error('Error saving district:', err);
      alert('Failed to save district');
    }
  };

  const handleToggle = async (id: string, type: 'state' | 'district') => {
    try {
      if (type === 'state') {
        await AdminAPI.toggleState(id);
      } else {
        await AdminAPI.toggleDistrict(id);
      }
      await loadData();
    } catch (err) {
      console.error(`Error toggling ${type}:`, err);
      alert(`Failed to toggle ${type} status`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete "${name}"? This action cannot be undone.`)) {
      try {
        await AdminAPI.deleteState(id);
        await loadData();
        alert('State deleted successfully');
      } catch (err: any) {
        console.error('Error deleting state:', err);
        const errorMessage = err.response?.data?.message || 'Failed to delete state';
        alert(errorMessage);
      }
    }
  };

  const filteredStates = states.filter(state =>
    state.name.toLowerCase().includes(search.toLowerCase())
  );
  console.log('Filtered states:', filteredStates, 'Search term:', search, 'All states:', states);

  const filteredDistricts = districts.filter(district =>
    district.name.toLowerCase().includes(search.toLowerCase())
  );
  console.log('Filtered districts:', filteredDistricts, 'Search term:', search, 'All districts:', districts);

  const StateModal: React.FC<{ state?: State; onClose: () => void; onSave: (data: StateForm) => void }> = ({
    state,
    onClose,
    onSave
  }) => {
    const [formData, setFormData] = useState<StateForm>({
      name: state?.name || '',
      statecode: state?.statecode || '',
      displayOrder: state?.displayOrder || undefined,
      is_active: state?.is_active !== false,
      defaultEntryDistrict: state?.defaultEntryDistrict?._id || null
    });

    // Update form data when state prop changes
    useEffect(() => {
      setFormData({
        name: state?.name || '',
        statecode: state?.statecode || '',
        displayOrder: state?.displayOrder || undefined,
        is_active: state?.is_active !== false,
        defaultEntryDistrict: state?.defaultEntryDistrict?._id || null
      });
    }, [state]);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name.trim()) {
        alert('State name is required');
        return;
      }
      onSave(formData);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              {state ? 'Edit State' : 'Add New State'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., Maharashtra"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State Code
                </label>
                <input
                  type="text"
                  value={formData.statecode || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, statecode: e.target.value.toUpperCase() }))}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 uppercase"
                  placeholder="e.g., MH"
                  maxLength={3}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.displayOrder || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: e.target.value ? parseInt(e.target.value) : undefined }))}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., 1"
                  min="1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Lower numbers appear first
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Entry District
                </label>
                <select
                  value={formData.defaultEntryDistrict || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, defaultEntryDistrict: e.target.value || null }))}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">No default district</option>
                  {districts
                    .filter(district => district.state_id === state?._id || !state)
                    .map(district => (
                      <option key={district._id} value={district._id}>
                        {district.name}
                      </option>
                    ))}
                </select>
                {!state && (
                  <p className="mt-1 text-xs text-gray-500">
                    Create the state first, then edit to add districts
                  </p>
                )}
              </div>
            </div>
            
            <div className="pt-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm font-medium text-gray-700">
                  Active State
                </label>
              </div>
              <p className="mt-1 ml-6 text-xs text-gray-500">
                Inactive states won't be visible to users
              </p>
            </div>
            
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center transition-colors"
              >
                <Save className="h-4 w-4 mr-2" />
                {state ? 'Update State' : 'Create State'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const DistrictModal: React.FC<{ district?: District; onClose: () => void; onSave: (data: DistrictForm) => void }> = ({
    district,
    onClose,
    onSave
  }) => {
    const [formData, setFormData] = useState<DistrictForm>({
      name: district?.name || '',
      state_id: district?.state_id || '',
      is_active: district?.is_active !== false
    });

    // Update form data when district prop changes
    useEffect(() => {
      setFormData({
        name: district?.name || '',
        state_id: district?.state_id || '',
        is_active: district?.is_active !== false
      });
    }, [district]);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name.trim() || !formData.state_id) {
        alert('District name and state are required');
        return;
      }
      onSave(formData);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {district ? 'Edit District' : 'Add New District'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">District Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter district name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">State</label>
              <select
                value={formData.state_id}
                onChange={(e) => setFormData(prev => ({ ...prev, state_id: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Select a state</option>
                {states.map(state => (
                  <option key={state._id} value={state._id}>{state.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="district_is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="district_is_active" className="ml-2 block text-sm text-gray-900">
                Active
              </label>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Location Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage states and districts for your border tax system.
          </p>
        </div>
        <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
          <button
            onClick={loadData}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={() => {
              setEditItem(null);
              setEditModalOpen(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {activeTab === 'states' ? 'State' : 'District'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('states')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'states'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <MapPin className="h-4 w-4 inline mr-1" />
            States ({states.length})
          </button>
          <button
            onClick={() => setActiveTab('districts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'districts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Building className="h-4 w-4 inline mr-1" />
            Districts ({districts.length})
          </button>
        </nav>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      {/* Content */}
      {activeTab === 'states' ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  State Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  State Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Display Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Default Entry District
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Districts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bookings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                  </tr>
                ))
              ) : filteredStates.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    No states found
                  </td>
                </tr>
              ) : (
                filteredStates.map((state) => (
                  <tr key={state._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {state.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {state.statecode || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {state.displayOrder}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {state.defaultEntryDistrict ? districts.find(d => d._id === state.defaultEntryDistrict?._id)?.name : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        state.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {state.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {state.districtCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {state.bookingCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹{(state.totalRevenue || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setEditItem(state);
                            setEditModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit State"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggle(state._id, 'state')}
                          className={state.is_active ? "text-red-600 hover:text-red-900" : "text-green-600 hover:text-green-900"}
                          title={state.is_active ? "Deactivate" : "Activate"}
                        >
                          {state.is_active ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(state._id, state.name)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete State"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  District Name
                </th>
               
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded"></div></td>
                  </tr>
                ))
              ) : filteredDistricts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No districts found
                  </td>
                </tr>
              ) : (
                filteredDistricts.map((district) => (
                  <tr key={district._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {district.name}
                    </td>
                  
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        district.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {district.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setEditItem(district);
                            setEditModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggle(district._id, 'district')}
                          className={district.is_active ? "text-red-600 hover:text-red-900" : "text-green-600 hover:text-green-900"}
                          title={district.is_active ? "Deactivate" : "Activate"}
                        >
                          {district.is_active ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {editModalOpen && (
        activeTab === 'states' ? (
          <StateModal
            state={editItem && editItem._id ? editItem as State : undefined}
            onClose={() => {
              setEditModalOpen(false);
              setEditItem(null);
            }}
            onSave={handleSaveState}
          />
        ) : (
          <DistrictModal
            district={editItem && editItem._id ? editItem as District : undefined}
            onClose={() => {
              setEditModalOpen(false);
              setEditItem(null);
            }}
            onSave={handleSaveDistrict}
          />
        )
      )}
    </div>
  );
};

export default States; 
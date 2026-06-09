import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Edit,
  X,
  Search,
  RefreshCw,
  Save,
  DollarSign,
  Car,
  MapPin,
  AlertCircle
} from 'lucide-react';
import AdminAPI from '../services/api';
import { Plan, VehicleType, State, PlanForm } from '../types';

const Plans: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [loading, setLoading] = useState(false);
  const [statesLoading, setStatesLoading] = useState(true);
  const [vehicleTypesLoading, setVehicleTypesLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Plan | null>(null);
  const [search, setSearch] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');

  useEffect(() => {
    loadStates();
  }, []);

  useEffect(() => {
    if (selectedState) {
      loadVehicleTypesByState();
      setSelectedVehicleType('');
      setPlans([]);
    } else {
      setVehicleTypes([]);
      setSelectedVehicleType('');
      setPlans([]);
    }
  }, [selectedState]);

  useEffect(() => {
    if (selectedVehicleType) {
      loadPlans();
    } else {
      setPlans([]);
    }
  }, [selectedVehicleType]);

  const loadStates = async () => {
    try {
      setStatesLoading(true);
      const statesData = await AdminAPI.getAllStates();
      setStates(statesData);
    } catch (err) {
      console.error('Error loading states:', err);
    } finally {
      setStatesLoading(false);
    }
  };

  const loadVehicleTypesByState = async () => {
    if (!selectedState) return;
    try {
      setVehicleTypesLoading(true);
      const vehicleTypesData = await AdminAPI.getVehicleTypes(selectedState);
      setVehicleTypes(vehicleTypesData);
    } catch (err) {
      console.error('Error loading vehicle types:', err);
      setVehicleTypes([]);
    } finally {
      setVehicleTypesLoading(false);
    }
  };

  const loadPlans = async () => {
    if (!selectedVehicleType) return;
    try {
      setLoading(true);
      const plansData = await AdminAPI.getPlans(selectedVehicleType);
      setPlans(plansData);
    } catch (err) {
      console.error('Error loading plans:', err);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: PlanForm) => {
    try {
      if (editItem) {
        await AdminAPI.updatePlan(editItem._id, data);
      } else {
        await AdminAPI.createPlan(data);
      }
      await loadPlans();
      setEditModalOpen(false);
      setEditItem(null);
    } catch (err) {
      console.error('Error saving plan:', err);
      alert('Failed to save plan');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await AdminAPI.togglePlan(id);
      await loadPlans();
    } catch (err) {
      console.error('Error toggling plan:', err);
      alert('Failed to toggle plan status');
    }
  };

  // ✅ FIX 1: Use populated plan.vehicle_type_id fields directly
  const filteredPlans = plans.filter(plan =>
    plan.vehicle_type_id?.name?.toLowerCase().includes(search.toLowerCase()) ||
    plan.plan_type.toLowerCase().includes(search.toLowerCase())
  );

  const PlanModal: React.FC<{
    plan?: Plan;
    onClose: () => void;
    onSave: (data: PlanForm) => void;
  }> = ({ plan, onClose, onSave }) => {
    const [formData, setFormData] = useState<PlanForm>({
      // ✅ FIX 4: Extract ._id string from populated object for edit case
      vehicle_type_id: plan?.vehicle_type_id?._id || selectedVehicleType,
      plan_type: plan?.plan_type || 'Daily',
      amount: plan?.amount || 0,
      is_active: plan?.is_active !== false,
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.vehicle_type_id || !formData.amount) {
        alert('Vehicle type and amount are required');
        return;
      }
      onSave(formData);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {plan ? 'Edit Plan' : 'Add New Plan'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Vehicle Type</label>
              <select
                value={formData.vehicle_type_id}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicle_type_id: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Select a vehicle type</option>
                {vehicleTypes.map(vehicleType => (
                  <option key={vehicleType._id} value={vehicleType._id}>
                    {vehicleType.name} ({states.find(s => s._id === vehicleType.state_id)?.name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Plan Type</label>
              <select
                value={formData.plan_type}
                onChange={(e) => setFormData(prev => ({ ...prev, plan_type: e.target.value as any }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <optgroup label="Traditional Plans">
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Yearly">Yearly</option>
                </optgroup>
                <optgroup label="Day-Based Plans">
                  {Array.from({ length: 20 }, (_, i) => (
                    <option key={i + 1} value={`Day ${i + 1}`}>Day {i + 1}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount (₹)</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter amount"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
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
            Plans & Pricing Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage pricing plans for different vehicle types and tax modes.
          </p>
        </div>
        <div className="mt-4 flex space-x-3 md:mt-0 md:ml-4">
          <button
            onClick={loadPlans}
            disabled={!selectedVehicleType}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={() => {
              setEditItem(null);
              setEditModalOpen(true);
            }}
            disabled={!selectedVehicleType}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Plan
          </button>
        </div>
      </div>

      {/* State and Vehicle Type Selection */}
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <MapPin className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-blue-900">Step 1: Select State</h3>
          </div>
          <p className="text-sm text-blue-700 mb-4">
            Choose a state to view available vehicle types. Plans are organized by state and vehicle type.
          </p>
          <div className="max-w-md">
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
              disabled={statesLoading}
            >
              <option value="">
                {statesLoading ? 'Loading states...' : 'Select a state'}
              </option>
              {states.map(state => (
                <option key={state._id} value={state._id}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedState && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Car className="h-5 w-5 text-green-600 mr-2" />
              <h3 className="text-lg font-medium text-green-900">Step 2: Select Vehicle Type</h3>
            </div>
            <p className="text-sm text-green-700 mb-4">
              Choose a vehicle type to view and manage its pricing plans.
            </p>
            <div className="max-w-md">
              <select
                value={selectedVehicleType}
                onChange={(e) => setSelectedVehicleType(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-base"
                disabled={vehicleTypesLoading}
              >
                <option value="">
                  {vehicleTypesLoading ? 'Loading vehicle types...' : 'Select a vehicle type'}
                </option>
                {vehicleTypes.map(vehicleType => (
                  <option key={vehicleType._id} value={vehicleType._id}>
                    {vehicleType.name}
                  </option>
                ))}
              </select>
            </div>
            {vehicleTypes.length === 0 && !vehicleTypesLoading && (
              <p className="text-sm text-yellow-600 mt-2">
                No vehicle types found for {states.find(s => s._id === selectedState)?.name}.
                Please add vehicle types for this state first.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {!selectedState ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No State Selected</h3>
          <p className="text-gray-500">
            Please select a state from the dropdown above to begin managing plans.
          </p>
        </div>
      ) : !selectedVehicleType ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Vehicle Type Selected</h3>
          <p className="text-gray-500">
            Please select a vehicle type from the dropdown above to view and manage its pricing plans.
          </p>
        </div>
      ) : (
        <>
          {/* Search Filter */}
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search plans..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Total Plans</h3>
                  <p className="text-2xl font-bold text-gray-900">{plans.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Active Plans</h3>
                  <p className="text-2xl font-bold text-gray-900">
                    {plans.filter(p => p.is_active).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <X className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Inactive Plans</h3>
                  <p className="text-2xl font-bold text-gray-900">
                    {plans.filter(p => !p.is_active).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Car className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Vehicle Type</h3>
                  <p className="text-xl font-bold text-gray-900">
                    {vehicleTypes.find(vt => vt._id === selectedVehicleType)?.name}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Plans Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Plans for {vehicleTypes.find(vt => vt._id === selectedVehicleType)?.name}
                in {states.find(s => s._id === selectedState)?.name}
              </h3>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    State
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  // ✅ FIX 5: 7 skeleton cells matching 7 columns
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-gray-200 rounded"></div>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredPlans.length === 0 ? (
                  // ✅ FIX 5: colSpan matches 7 columns
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No plans found for {vehicleTypes.find(vt => vt._id === selectedVehicleType)?.name}
                    </td>
                  </tr>
                ) : (
                  filteredPlans.map((plan) => (
                    <tr key={plan._id} className="hover:bg-gray-50">
                      {/* ✅ FIX 2 & 3: Read directly from populated plan.vehicle_type_id */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {plan.vehicle_type_id?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {plan.vehicle_type_id?.state_id?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {plan.plan_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ₹{plan.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          plan.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {plan.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(plan.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setEditItem(plan);
                              setEditModalOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggle(plan._id)}
                            className={plan.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                            title={plan.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {plan.is_active ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal */}
      {editModalOpen && (
        <PlanModal
          plan={editItem || undefined}
          onClose={() => {
            setEditModalOpen(false);
            setEditItem(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default Plans;
import React, { useState, useMemo } from "react";
import ReactDOM from "react-dom";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../firebase/config"; // Ensure this path matches your firebase setup

export default function SuggestEditModal({
  show,
  suggestedEdit,
  setShowEditModal,
  handleEditChange,
  allRoutes,
  setSuggestedEdit, // You need this to update the selected route name/id
  onSubmitEdit // <--- Add it here!
}) {
  const [search, setSearch] = useState("");

  const filteredRoutes = useMemo(() => {
    // 1. If no routes exist yet, return empty
    if (!allRoutes || allRoutes.length === 0) return [];
    
    // 2. If search is empty, return all routes (or change to [] if you prefer it hidden)
    if (!search) return []; 

    // 3. Robust filtering: check name, stops, and landmarks
    return allRoutes.filter((r) => {
      const searchTerm = search.toLowerCase();
      return (
        (r.name && r.name.toLowerCase().includes(searchTerm)) ||
        (r.stops && r.stops.some(s => s.toLowerCase().includes(searchTerm))) ||
        (r.landmarks && r.landmarks.toLowerCase().includes(searchTerm))
      );
    });
  }, [search, allRoutes]);
  if (!show) return null;

  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#000000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      padding: '16px',
      overflowY: 'auto'
    }}>
      <div style={{
        backgroundColor: '#000000',
        border: '3px solid #EAB308',
        borderRadius: '16px',
        padding: '24px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 0 20px rgba(234, 179, 8, 0.2)'
      }}>
        <h2 style={{ color: '#EAB308', textAlign: 'center', fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
          Suggest Route Edit
        </h2>

        {/* Search Bar for Routes */}
        <input
          type="text"
          placeholder="Search for a route to edit..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', padding: '10px', marginBottom: '10px', background: '#111', border: '1px solid #4B5563', color: '#FFF', borderRadius: '6px' }}
        />

        {/* Results Dropdown */}
        {filteredRoutes.length > 0 && (
          <div style={{ maxHeight: '100px', overflowY: 'auto', marginBottom: '16px', border: '1px solid #EAB308', borderRadius: '6px' }}>
            {filteredRoutes.map((r) => (
              <div 
                key={r.id} 
                onClick={() => {
                  setSuggestedEdit(prev => ({ ...prev, routeName: r.name, routeId: r.id }));
                  setSearch(""); // Clear search after selection
                }}
                style={{ padding: '8px', color: '#FFF', cursor: 'pointer', borderBottom: '1px solid #333' }}
              >
                {r.name}
              </div>
            ))}
          </div>
        )}

        <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '20px', textAlign: 'center' }}>
          Editing: <span style={{ color: '#FFFFFF', fontWeight: '600' }}>{suggestedEdit?.routeName || "Selected Route"}</span>
        </p>

        {/* Input Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { label: 'New Fare (₹)', name: 'fare', placeholder: 'e.g. 20' },
            { label: 'New Frequency', name: 'frequency', placeholder: 'e.g. Every 5 mins' },
            { label: 'Operating Hours', name: 'hours', placeholder: 'e.g. 6 AM - 10 PM' },
            { label: 'Landmarks', name: 'landmarks', placeholder: 'e.g. Near Station East' }
          ].map((field) => (
            <div key={field.name}>
              <label style={{ fontSize: '12px', color: '#EAB308', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                {field.label}
              </label>
              <input
                type="text"
                name={field.name}
                placeholder={field.placeholder}
                value={suggestedEdit?.[field.name] || ""}
                onChange={handleEditChange}
                style={{ width: '100%', backgroundColor: '#111', color: '#FFF', padding: '10px', border: '1px solid #4B5563', borderRadius: '6px', boxSizing: 'border-box' }}
              />
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
        <button
          onClick={onSubmitEdit}
          style={{ width: '100%', backgroundColor: '#EAB308', color: '#000', fontWeight: 'bold', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
        >
          Submit Correction
        </button>
          <button
            onClick={() => setShowEditModal(false)}
            style={{ width: '100%', backgroundColor: 'transparent', color: '#9CA3AF', padding: '12px', borderRadius: '8px', border: '1px solid #4B5563', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
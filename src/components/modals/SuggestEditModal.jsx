import React, { useState, useMemo } from "react";
import ReactDOM from "react-dom";
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../firebase/config"; 

// --- MAP DRAG LISTENER ---
function MapDragListener({ onLocationSelect }) {
  const map = useMapEvents({
    dragend: () => {
      const center = map.getCenter();
      onLocationSelect({ lat: center.lat, lng: center.lng });
    }
  });
  return null;
}

export default function SuggestEditModal({
  show,
  suggestedEdit,
  setShowEditModal,
  handleEditChange,
  allRoutes,
  setSuggestedEdit,
  onSubmitEdit 
}) {
  const [search, setSearch] = useState("");

  // --- MAP MODAL STATES ---
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [tempCoords, setTempCoords] = useState({ lat: 19.1963, lng: 72.9656 }); // Default Thane
  const [activePinIndex, setActivePinIndex] = useState(null); // Tracks WHICH stop we are pinning
  // -----------------------------

  const filteredRoutes = useMemo(() => {
    if (!allRoutes || allRoutes.length === 0) return [];
    if (!search) return []; 

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
    <>
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)', /* This creates the glass effect */
        zIndex: 999999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '32px 16px',
        overflowY: 'auto'
      }}>
        <div className="cyber-modal" style={{ width: '100%', maxWidth: '400px' }}>
          <h2 style={{ color: '#EAB308', textAlign: 'center', fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
            Suggest Route Edit
          </h2>

          <input
            type="text"
            placeholder="Search for a route to edit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="cyber-input"
            style={{ marginBottom: '10px' }}
          />
          {filteredRoutes.length > 0 && (
            <div style={{ maxHeight: '100px', overflowY: 'auto', marginBottom: '16px', border: '1px solid #EAB308', borderRadius: '6px' }}>
              {filteredRoutes.map((r) => (
                <div 
                  key={r.id} 
                  onClick={() => {
                    // 1. Extract existing stops
                    const existingStops = r.stops ? [...r.stops] : [];
                    
                    // 2. Extract existing pins
                    const existingPins = r.stopCoords && r.stopCoords.length === existingStops.length 
                      ? [...r.stopCoords] 
                      : new Array(existingStops.length).fill(null);
                      
                    // SMART FALLBACK: If it's an older route, put the root lat/lng into the 1st pin!
                    if (!existingPins[0] && r.lat && r.lng) {
                      existingPins[0] = { lat: r.lat, lng: r.lng };
                    }

                    // 3. Load them into the edit state
                    setSuggestedEdit(prev => ({ 
                      ...prev, 
                      routeName: r.name, 
                      routeId: r.id,
                      newStopsArray: existingStops,
                      newPinsArray: existingPins
                    }));
                    
                    setSearch(""); 
                    if (r.lat && r.lng) setTempCoords({ lat: r.lat, lng: r.lng });
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* --- NEW: DYNAMIC STOPS & PINS LIST --- */}
            {suggestedEdit?.newStopsArray && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', backgroundColor: '#111', borderRadius: '8px', border: '1px solid #4B5563' }}>
                <label style={{ fontSize: '12px', color: '#EAB308', fontWeight: 'bold' }}>Edit Stops & Locations:</label>
                {suggestedEdit.newStopsArray.map((stopName, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                      value={stopName}
                      onChange={(e) => {
                        const updatedStops = [...suggestedEdit.newStopsArray];
                        updatedStops[idx] = e.target.value;
                        setSuggestedEdit(prev => ({ ...prev, newStopsArray: updatedStops }));
                      }}
                      className="cyber-input"
                      style={{ flex: 1, padding: '8px', fontSize: '13px', margin: 0 }}
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        setActivePinIndex(idx); // Tell the map WHICH stop we are fixing
                        
                        // If they already pinned it, open the map exactly on that pin
                        if (suggestedEdit.newPinsArray[idx] && suggestedEdit.newPinsArray[idx].lat) {
                          setTempCoords(suggestedEdit.newPinsArray[idx]);
                        }
                        setIsMapModalOpen(true);
                      }}
                      style={{
                        backgroundColor: suggestedEdit.newPinsArray[idx] ? '#1a1a1a' : '#39FF14',
                        color: suggestedEdit.newPinsArray[idx] ? '#39FF14' : '#000',
                        border: suggestedEdit.newPinsArray[idx] ? '1px solid #39FF14' : 'none',
                        padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', minWidth: '85px'
                      }}
                    >
                      {suggestedEdit.newPinsArray[idx] ? '✓ Pinned' : '📍 Fix Pin'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* General Route Details */}
            {[
              { label: 'New Fares (comma separated)', name: 'fares', placeholder: 'e.g. 15, 30 (Skip the start point)' },
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
                  className="cyber-input"
                />
              </div>
            ))}
          </div>

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
      </div>

      {/* MAP OVERLAY MODAL */}
      {isMapModalOpen && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: '#0a0a0a', 
          zIndex: 9999999,
          display: 'flex', flexDirection: 'column', padding: '16px'
        }}>
          <h3 style={{ color: '#39FF14', textAlign: 'center', margin: '10px 0' }}>Fix the Stand Location</h3>
          <p style={{ color: '#888', textAlign: 'center', fontSize: '12px', margin: '0 0 15px 0' }}>Drag the map until the pin is exactly on the stand.</p>
          
          <div style={{ position: 'relative', flex: 1, borderRadius: '16px', overflow: 'hidden', border: '2px solid #333' }}>
            <MapContainer center={[tempCoords.lat, tempCoords.lng]} zoom={16} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                attribution="&copy; Google Maps"
                className="dark-map-tiles"
              />
              <MapDragListener onLocationSelect={(coords) => setTempCoords(coords)} />
            </MapContainer>

            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -100%)', 
              zIndex: 1000, pointerEvents: 'none',
              fontSize: '40px', textShadow: '0px 4px 10px rgba(0,0,0,0.8)'
            }}>
              📍
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button 
              type="button"
              onClick={() => setIsMapModalOpen(false)} 
              style={{ flex: 1, padding: '15px', backgroundColor: '#333', color: '#fff', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}
            >
              Cancel
            </button>
            <button 
              type="button"
              onClick={() => {
                // Save the exact coordinates to the CORRECT stop index!
                const updatedPins = [...(suggestedEdit.newPinsArray || [])];
                updatedPins[activePinIndex] = tempCoords;
                
                setSuggestedEdit(prev => ({ ...prev, newPinsArray: updatedPins }));
                setIsMapModalOpen(false);
              }}
              style={{ flex: 2, padding: '15px', backgroundColor: '#39FF14', color: '#000', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}
            >
              Confirm Correction
            </button>
          </div>
        </div>
      )}
    </>,
    document.body // <-- THIS IS THE CRITICAL FIX THAT I MISSED BEFORE
  );
}
import React, { useState } from 'react';
import { COORDS } from '../../data';
import autoIcon from '../../assets/auto.svg';

// --- THEME COLORS & CONSTANTS ---
const Y = '#EAB308';
const TXT = '#FFFFFF';
const MUTED = '#888888';
const CARD = '#1A1A1A';
const BORDER = '#333333';

// Fallback dictionary to prevent crashes

// --- META & TYPEBADGE ---
// Moved outside the main function so both RouteCard and TypeBadge can use it!
const META = {
  // Uses the public folder path directly
  taxi: { color: '#EAB308', icon: '/taxi.svg', bg: 'rgba(234, 179, 8, 0.1)', l: 'Taxi' },
  
  // Uses the imported variable from the assets folder
  auto: { color: '#22C55E', icon: autoIcon, bg: 'rgba(34, 197, 94, 0.1)', l: 'Auto' }
};

const TypeBadge = ({ type }) => {
  // Fallback in case type is missing
  const m = META[type] || META.taxi; 
  
  return (
    <div
      style={{
        background: m.bg,
        color: m.color,
        border: `1px solid ${m.color}55`,
        fontSize: 10,
        fontWeight: 800,
        padding: '4px 8px',
        borderRadius: 20,
        whiteSpace: 'nowrap',
        display: 'flex', 
        alignItems: 'center',
        gap: '6px' 
      }}
    >
      <img src={m.icon} alt={m.l} style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
      {m.l}
    </div>
  );
};

function RouteCard({ route, selected, onSelect, distance, onDelete, adminMode, onNavigate, onSuggestEdit, language, translations }) {
    const [confirmDel, setConfirmDel] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const m = META[route.type] || META.taxi;
    
    const distLabel =
      distance != null
        ? distance < 0.1
          ? '< 100m'
          : distance < 1
          ? `${Math.round(distance * 1000)}m`
          : `${distance.toFixed(1)} km`
        : null;
  
    return (
      <div
        className="route-card" 
        style={{
          position: 'relative',
          background: selected ? m.bg : CARD,
          border: `2px solid ${selected ? m.color : BORDER}`,
          borderRadius: 14,
          padding: '12px 14px',
          marginBottom: 8,
          cursor: 'pointer',
  
        }}
        onClick={() => !confirmDel && onSelect()}
      >
        {/* Hidden Delete Overlay */}
        {confirmDel && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(160,0,0,0.97)',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              zIndex: 10,
            }}
          >
            <div style={{ color: TXT, fontWeight: 800 }}>Delete this route?</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(route.id);
                }}
                style={{
                  padding: '6px 16px',
                  background: TXT,
                  color: '#dc2626',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDel(false);
                }}
                style={{
                  padding: '6px 16px',
                  background: 'rgba(255,255,255,0.2)',
                  color: TXT,
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
  
        {/* Top Row: Route Name & Badge */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: TXT,
              paddingRight: adminMode ? 32 : 0,
            }}
          >
            {route.name}
          </div>
          <TypeBadge type={route.type} />
        </div>
  
        {/* Admin Trash Icon */}
        {adminMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDel(true);
            }}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'transparent',
              border: 'none',
              color: '#555',
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            🗑️
          </button>
        )}
  
        {/* Bottom Row: Fare, Frequency, Distance */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 7,
            fontSize: 12,
            color: MUTED,
          }}
        >
         
          <span> 🕦 {translations[language].every} {String(route.freq || route.frequency || '').toLowerCase().replace('every', '').replace('mins', '').trim()} {translations[language].mins}</span>
          {distLabel && (
            <span style={{ color: Y, fontWeight: 700 }}>📍 {distLabel} away</span>
          )}
        </div>
  
        {/* Expanded Stops View (When Clicked) */}
        {selected && (
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: `1px solid ${m.color}33`,
            }}
          >
            {route.landmarks && (
              <div style={{ fontSize: 12, color: Y, marginBottom: 10, fontWeight: 700, display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                <span>🏛️</span>
                <span style={{ color: '#ddd', fontWeight: 500, lineHeight: 1.4 }}>
                  <span style={{ color: Y, fontWeight: 700 }}>Landmarks: </span> 
                  {route.landmarks}
                </span>
              </div>
            )}
  
  <div style={{ marginTop: '12px', background: '#1a1a1a', padding: '10px', borderRadius: '8px', marginBottom: 8 }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Route & Fares
            </h4>
            
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#eee', fontSize: '14px' }}>
            {route.stops.map((s, i) => {
            let lat, lng;

            // 1. DYNAMIC ROUTES: Check if we saved the coordinates array from the form!
            if (route.stopCoordinates && route.stopCoordinates[i]) {
              lat = route.stopCoordinates[i].lat;
              lng = route.stopCoordinates[i].lng;
            } 
            // 2. OLD ROUTES FALLBACK: Only grab the main lat/lng if it's the very first stop
            else if (i === 0 && route.lat && route.lng) {
              lat = route.lat;
              lng = route.lng;
            }
            // 3. HARDCODED FALLBACK: Just in case older routes need it
            else if (typeof COORDS !== 'undefined') {
              const match = Object.keys(COORDS).find(k => k.toLowerCase() === s.toLowerCase().trim());
              if (match) {
                lat = COORDS[match].lat;
                lng = COORDS[match].lng;
              }
            }
                
                const hasCoords = lat !== undefined && lng !== undefined;
                return (
                  <li 
                    key={i}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: i === route.stops.length - 1 ? 'none' : '1px dashed #333' 
                    }}
                  >
                    {/* THE CLICKABLE STOP NAME WITH EMOJIS */}
                    <span
                     onClick={(e) => {
                      e.stopPropagation(); 
                
                      if (hasCoords && typeof onNavigate === 'function') onNavigate(s, lat, lng);
                    }}
                      style={{
                        cursor: hasCoords ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: hasCoords ? '#60a5fa' : '#ddd', // Make clickable links light blue
                      }}
                    >
                     <span>{['📍', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'][i] || '📍'}</span>
                      {s} 
                      {hasCoords && <span title="Get walking directions" style={{ fontSize: '12px' }}>🚶</span>}
                    </span>
                    
                    {/* THE NEW DYNAMIC FARE COMPONENT */}
                    {i > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {/* Rupee sign bumped up to 14px */}
            <span style={{ color: '#aaa', fontWeight: 'bold', fontSize: '14px' }}>₹</span>
            
            {/* Screen and numbers increased by ~30% */}
            <span 
              style={{ 
                fontFamily: "'RickshawMeter', monospace",
                fontSize: '16px', // Increased from 12px
                color: '#ff0000', 
                backgroundColor: '#0a0a0a', 
                padding: '3px 6px', // Slightly larger box to fit the new size
                borderRadius: '2px', 
                letterSpacing: '1px',
                // Glow scaled up slightly to match the larger text
                textShadow: '0 0 3px #ff0000, 0 0 8px #ff0000', 
                boxShadow: 'inset 0 0 5px rgba(0,0,0,0.8)' 
              }}
            >
              {route.fares && route.fares[i] ? route.fares[i] : '00'}
            </span>
          </div>
        )}
                  </li>
                );
              })}
            </ul>
            </div>
          
          <div style={{ fontSize: 12, color: '#aaa', marginTop: '12px' }}>{route.hours}</div>
          {/* Bottom Bar: Just the Info Button on the right */}
<div style={{
  marginTop: '12px',
  display: 'flex',
  justifyContent: 'flex-end', // Changed this so the button hugs the right wall!
  position: 'relative'
}}>
  {/* Info (i) Button */}
  <button
    onClick={(e) => {
      e.stopPropagation();
      setShowInfo(!showInfo);
    }}
    title="Route Verification Info"
    style={{
      width: '22px',
      height: '22px',
      borderRadius: '50%',
      backgroundColor: showInfo ? 'rgba(52, 211, 153, 0.2)' : '#27272a',
      border: `1px solid ${showInfo ? '#34d399' : '#3f3f46'}`,
      color: showInfo ? '#34d399' : '#a1a1aa',
      fontSize: '12px',
      fontWeight: 'bold',
      fontFamily: 'serif',
      fontStyle: 'italic',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      outline: 'none'
    }}
  >
    i
  </button>

  {/* Popup Box */}
  {showInfo && (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        bottom: '30px',
        right: '0',
        width: '260px',
        padding: '12px',
        borderRadius: '12px',
        backgroundColor: '#18181b',
        border: '1px solid #3f3f46',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.8), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
        zIndex: 50,
        textAlign: 'left'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: '2px'
        }}>
          <span style={{ color: '#34d399', fontSize: '10px', fontWeight: 'bold' }}>✓</span>
        </div>
        <div>
          <strong style={{ color: '#f4f4f5', display: 'block', marginBottom: '2px', fontSize: '12px' }}>
            Verified Route Data
          </strong>
          <p style={{ fontSize: '11px', color: '#a1a1aa', lineHeight: '1.4', margin: 0 }}>
            Boarding spots, landmarks, and route paths are verified for accuracy. Fares and frequency are local estimates subject to real-time traffic and peak hours.
          </p>
        </div>
      </div>
    </div>
  )}
</div>
        </div>
      )}
    </div>
  );
}

export default RouteCard;
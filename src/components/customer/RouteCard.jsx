import React, { useState } from 'react';
import { COORDS } from '../../data';

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
  taxi: { color: '#EAB308', icon: '🚕', bg: 'rgba(234, 179, 8, 0.1)', l: 'Taxi' },
  auto: { color: '#22C55E', icon: '🛺', bg: 'rgba(34, 197, 94, 0.1)', l: 'Auto' }
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
      <span style={{ fontSize: '14px' }}>{m.icon}</span>
      {m.l}
    </div>
  );
};

function RouteCard({ route, selected, onSelect, distance, onDelete, adminMode, onNavigate, onSuggestEdit, language, translations }) {
    const [confirmDel, setConfirmDel] = useState(false);
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
          <span style={{ 
            fontFamily: '"Share Tech Mono", monospace', 
            color: '#ff3333',
            textShadow: '0px 0px 8px rgba(255, 51, 51, 0.8)',
            fontSize: '15px',
            letterSpacing: '1px',
            background: '#111',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid #333'
          }}>
          ₹ {(route.fare || '').replace('₹', '').trim()}
          </span>
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
  
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 5,
                marginBottom: 8,
              }}
            >
              {route.stops.map((s, i) => {
                let lat, lng;
                // 1. Check if it's in the path array (for old routes)
        if (route.path && route.path[i]) {
          lat = Array.isArray(route.path[i]) ? route.path[i][0] : route.path[i].lat;
          lng = Array.isArray(route.path[i]) ? route.path[i][1] : route.path[i].lng;
      } 
      // 2. NEW: Check if it's saved at the top level (for your new routes)
      else if (route.lat && route.lng) {
          lat = route.lat;
          lng = route.lng;
      } 
      // 3. Fallback to the COORDS dictionary
      else if (COORDS[s]) {
          lat = COORDS[s].lat;
          lng = COORDS[s].lng;
      }
                
                const hasCoords = lat !== undefined && lng !== undefined;
  
                return (
                  <span
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation(); 
                      if (hasCoords && onNavigate) onNavigate(s, lat, lng);
                    }}
                    style={{
                      background: '#252525',
                      color: '#ddd',
                      fontSize: 11,
                      padding: '3px 8px',
                      borderRadius: 10,
                      cursor: hasCoords ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      border: '1px solid #444' 
                    }}
                  >
                    {s} {hasCoords && <span title="Get walking directions">🚶</span>}
                  </span>
                );
              })}
            </div>
            <div style={{ fontSize: 12, color: '#aaa' }}>{route.hours}</div>
          </div>
        )}
      </div>
    );
}

export default RouteCard;
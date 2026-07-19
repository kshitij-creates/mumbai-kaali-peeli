import React from 'react';

export default function FaqModal({ isOpen, onClose, onOpenTour }) {
  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
          position: 'relative',
          color: '#eee',
          fontFamily: '"Share Tech Mono", monospace',
        }}
        onClick={(e) => e.stopPropagation()} // Prevents closing when clicking inside the box
      >
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'transparent',
            border: 'none',
            color: '#888',
            fontSize: '24px',
            cursor: 'pointer'
          }}
        >
          ×
        </button>

        {/* Header with Title and Switch Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
          <h2 style={{ color: '#FFD700', margin: 0 }}>
            App FAQ & Guide
          </h2>
          
          <button 
            onClick={onOpenTour}
            style={{
              background: '#333',
              color: '#eee',
              border: '1px solid #555',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontFamily: '"Share Tech Mono", monospace',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            Interactive Tour 🚀
          </button>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Section 1 */}
          <div>
            <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '8px' }}>🚕 What exactly is this app?</h3>
            <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
              This is a community-driven map for finding share auto and Kaali-Peeli taxi routes. Instead of waiting at a corner hoping a shared ride shows up, you can see exact routes, stops, fares, and wait times all in one place.
            </p>
          </div>

          <div>
            <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '8px' }}>📱 Is this a ride-booking app?</h3>
            <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
              Nope! We don't book rides or take payments. This is an informational map built by the community, for the community, to make daily local commuting easier.
            </p>
          </div>

          <div style={{ height: '1px', background: '#333', margin: '10px 0' }}></div>

          {/* Section 2 */}
          <div>
            <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '8px' }}>🗺️ How do I find a route?</h3>
            <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
              Tap the <strong style={{ color: '#FFD700' }}>Near Me</strong> button to instantly see routes starting around your current location, or use the search bar to type in your specific stop (e.g., "Kolshet").
            </p>
          </div>

          <div>
            <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '8px' }}>🏷️ What do the tags mean?</h3>
            <ul style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.6', margin: 0, paddingLeft: '20px' }}>
              <li><strong style={{ color: '#ef4444' }}>Red Tag:</strong> Exact fare (price) for that stop.</li>
              <li><strong style={{ color: '#3b82f6' }}>Time:</strong> How often a vehicle usually departs.</li>
              <li><strong style={{ color: '#10b981' }}>Distance:</strong> How far away the route's starting point is from you.</li>
            </ul>
          </div>

          <div style={{ height: '1px', background: '#333', margin: '10px 0' }}></div>

          {/* Section 3 */}
          <div>
            <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '8px' }}>➕ How do I add a missing route?</h3>
            <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
              Open the Menu and tap <strong style={{ color: '#FFD700' }}>+ Add route</strong>. Fill in the starting point and click + then Fill in the stops/destination, fare, and frequency. It will be sent to Admin for a quick review before appearing on the map!
            </p>
          </div>

          <div>
            <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '8px' }}>✏️ Can I fix a wrong price or time?</h3>
            <p style={{ color: '#aaa', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
              Yes! Tap the <strong style={{ color: '#FFD700' }}>Suggest Edit</strong> button on any route card to submit updated prices, timings, or landmarks.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
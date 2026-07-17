import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function AdminDashboard({ pendingRoutes= [], onApproveRoute, onRejectRoute, onBack }) {
  const [edits, setEdits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch the edits (New routes are passed in as props from App.jsx)
  useEffect(() => {
    const fetchEdits = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "pending_edits"));
        setEdits(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching edits:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEdits();
  }, []);

  const handleEditApproval = async (edit, approve) => {
    try {
      if (approve) {
        const routeRef = doc(db, "approved_routes", edit.routeId);
        const updateData = {};
        if (edit.fare && edit.fare !== "No change") updateData.fare = edit.fare;
        if (edit.frequency && edit.frequency !== "No change") updateData.freq = edit.frequency;
        if (edit.hours && edit.hours !== "No change") updateData.hours = edit.hours;
        if (edit.landmarks && edit.landmarks !== "No change") updateData.landmarks = edit.landmarks;

        // Only update if there's actually data to change
        if (Object.keys(updateData).length > 0) {
           await updateDoc(routeRef, updateData);
           alert("Route updated successfully!");
        }
      }

      await deleteDoc(doc(db, "pending_edits", edit.id));
      setEdits(edits.filter(e => e.id !== edit.id));
    } catch (error) {
      console.error("Error processing request:", error);
      alert("Failed to process. Check console for details.");
    }
  };

  return (
    <div style={{ color: '#FFF', paddingBottom: '40px' }}>
      {/* HEADER WITH BACK BUTTON */}
      <div style={{ background: '#000', borderBottom: '1px solid #2a2a2a', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, color: '#16a34a', fontSize: 20, fontWeight: 900 }}>🛡️ Admin Dashboard</h1>
        <button onClick={onBack} style={{ background: '#333', color: '#FFF', border: 'none', padding: '6px 12px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
          Back to App
        </button>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        
        {/* SECTION 1: NEW ROUTES */}
        <h2 style={{ color: '#EAB308', borderBottom: '1px solid #333', paddingBottom: '10px' }}>🆕 Pending New Routes</h2>
        {pendingRoutes.length === 0 ? (
          <p style={{ color: '#888', marginBottom: '40px' }}>No new routes pending.</p>
        ) : (
          pendingRoutes.map((r) => (
            <div key={r.id} style={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 700, fontSize: '18px' }}>{r.name}</div>
                <div style={{ background: r.type === 'auto' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)', color: r.type === 'auto' ? '#22C55E' : '#EAB308', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                  {r.type === 'auto' ? '🛺 Auto' : '🚕 Taxi'}
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#CCC', margin: '12px 0' }}>
                <strong>Stops:</strong> {r.stops ? r.stops.join(' → ') : 'N/A'}<br />
                <span style={{ color: '#ff3333' }}>💰 {r.fare}</span> | 🔄 {r.freq} | 🕒 {r.hours}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => onApproveRoute(r)} style={{ flex: 1, background: '#16a34a', color: '#fff', border: 'none', padding: '8px', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>✅ Approve</button>
                <button onClick={() => onRejectRoute(r.id)} style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', padding: '8px', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>❌ Reject</button>
              </div>
            </div>
          ))
        )}

        {/* SECTION 2: SUGGESTED EDITS */}
        <h2 style={{ color: '#EAB308', borderBottom: '1px solid #333', paddingBottom: '10px', marginTop: '40px' }}>✏️ Suggested Route Edits</h2>
        {loading ? (
          <p style={{ color: '#888' }}>Loading edits...</p>
        ) : edits.length === 0 ? (
          <p style={{ color: '#888' }}>No pending edits at the moment.</p>
        ) : (
          edits.map(edit => (
            <div key={edit.id} style={{ border: '1px dashed #EAB308', borderRadius: '12px', padding: '16px', marginBottom: '16px', backgroundColor: '#111' }}>
              <h3 style={{ marginTop: 0, color: '#FFF' }}>Target: {edit.routeName}</h3>
              <div style={{ fontSize: '14px', color: '#CCC', marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ background: '#000', padding: '8px', borderRadius: '6px' }}><strong>Fare:</strong> {edit.fare}</div>
                <div style={{ background: '#000', padding: '8px', borderRadius: '6px' }}><strong>Freq:</strong> {edit.frequency}</div>
                <div style={{ background: '#000', padding: '8px', borderRadius: '6px' }}><strong>Hours:</strong> {edit.hours}</div>
                <div style={{ background: '#000', padding: '8px', borderRadius: '6px' }}><strong>Landmarks:</strong> {edit.landmarks}</div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => handleEditApproval(edit, true)} style={{ flex: 1, backgroundColor: '#22C55E', color: '#000', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✅ Approve Edit</button>
                <button onClick={() => handleEditApproval(edit, false)} style={{ flex: 1, backgroundColor: '#EF4444', color: '#FFF', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>❌ Reject Edit</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
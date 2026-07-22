import React, { useState, useMemo, useEffect } from 'react';
import { db } from "./firebase/config";
import { getFirestore, collection, addDoc, deleteDoc, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import autoIcon from './assets/auto.svg';
import ReactDOM from 'react-dom';
import Toast from "./components/shared/toast";
import SuggestEditModal from "./components/modals/SuggestEditModal";
import RouteCard from './components/customer/RouteCard';
import CustomerView from './components/customer/CustomerView';
import AdminDashboard from "./components/admin/AdminDashboard";
import { Analytics } from "@vercel/analytics/react";
// ── DATA & COLORS ────────────────────────────────────────────────────────────
const COORDS = {
  Dahisar: { lat: 19.2527, lng: 72.8581 },
  Borivali: { lat: 19.2307, lng: 72.8567 },
  Kandivali: { lat: 19.2057, lng: 72.8524 },
  Malad: { lat: 19.1872, lng: 72.849 },
  Goregaon: { lat: 19.1663, lng: 72.8526 },
  Lokhandwala: { lat: 19.1388, lng: 72.8268 },
  'Andheri (W)': { lat: 19.1197, lng: 72.8468 },
  'Andheri (E)': { lat: 19.1136, lng: 72.8697 },
  'MIDC Andheri': { lat: 19.1128, lng: 72.8826 },
  'Vile Parle': { lat: 19.099, lng: 72.8445 },
  Santacruz: { lat: 19.0821, lng: 72.8416 },
  'Bandra (W)': { lat: 19.0596, lng: 72.8295 },
  'Bandra (E)': { lat: 19.0544, lng: 72.8494 },
  Kurla: { lat: 19.0728, lng: 72.8826 },
  Ghatkopar: { lat: 19.0863, lng: 72.9082 },
  Vikhroli: { lat: 19.1089, lng: 72.9258 },
  Mulund: { lat: 19.1726, lng: 72.9566 },
  Thane: { lat: 19.2183, lng: 72.9781 },
  Mahim: { lat: 19.0421, lng: 72.842 },
  Dadar: { lat: 19.0213, lng: 72.8427 },
  'Lower Parel': { lat: 18.9977, lng: 72.8296 },
  Worli: { lat: 19.0131, lng: 72.8176 },
  CST: { lat: 18.9398, lng: 72.8355 },
  Churchgate: { lat: 18.9354, lng: 72.8264 },
  Colaba: { lat: 18.9067, lng: 72.8147 },
  "thane station (w)": { lat: 19.1860, lng: 72.9759 },
};

const BASE_ROUTES = [
  {
    id: 1,
    type: 'share_taxi',
    name: 'Bandra (W) → Kurla',
    stops: ['Bandra (W)', 'Bandra (E)', 'Kurla'],
    fare: '₹15–20',
    freq: 'Every 5–10 min',
    hours: '06:00 AM - 11:30 PM',
  },
  {
    id: 2,
    type: 'share_taxi',
    name: 'Andheri (W) → Lokhandwala',
    stops: ['Andheri (W)', 'Lokhandwala'],
    fare: '₹10–15',
    freq: 'Every 5 min',
    hours: '24 Hours',
  },
  {
    id: 3,
    type: 'share_taxi',
    name: 'Borivali → Dahisar',
    stops: ['Borivali', 'Dahisar'],
    fare: '₹10–15',
    freq: 'Every 5–8 min',
    hours: '05:00 AM - 12:00 AM',
  },
  {
    id: 4,
    type: 'share_taxi',
    name: 'Kurla → Thane',
    stops: ['Kurla', 'Ghatkopar', 'Mulund', 'Thane'],
    fare: '₹20–30',
    freq: 'Every 8–12 min',
    hours: '06:00 AM - 11:00 PM',
  },
  {
    id: 5,
    type: 'auto',
    name: 'Goregaon → Malad',
    stops: ['Goregaon', 'Malad'],
    fare: '₹15–20',
    freq: 'Every 5 min',
    hours: '24 Hours',
  },
];

const Y = '#FFD700',
  BK = '#000000',
  DK = '#111111',
  CARD = '#1A1A1A',
  BORDER = '#333',
  TXT = '#FFF',
  MUTED = '#A0A0A0';
  const META = {
    share_taxi: { 
      l: 'Share Taxi', 
      icon: "/taxi.svg",
      color: Y, 
      bg: '#2A2400' 
    },
    auto: { 
      l: 'Auto', 
      icon: autoIcon, // No quotes! Using the imported variable
      color: '#22c55e', 
      bg: '#062a14' 
    },
  };
const inp = {
  width: '100%',
  padding: '12px',
  borderRadius: 10,
  background: '#222',
  border: `1px solid ${BORDER}`,
  color: TXT,
  fontSize: 14,
  boxSizing: 'border-box',
};



// ── Admin Login Modal ────────────────────────────────────────────────────────
function AdminLoginModal({ onSuccess, onCancel }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const handleLogin = () => {
    if (pin === '1234') onSuccess();
    else setErr('Incorrect PIN');
  };
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: CARD,
          padding: 24,
          borderRadius: 16,
          border: `1px solid ${BORDER}`,
          width: '100%',
          maxWidth: 320,
        }}
      >
        <h2 style={{ margin: '0 0 16px', color: Y }}>Admin Login</h2>
        <input
          type="password"
          placeholder="Enter Admin PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          style={{ ...inp, marginBottom: 12 }}
        />
        {err && (
          <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 12 }}>
            {err}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleLogin}
            style={{
              flex: 1,
              background: Y,
              color: BK,
              padding: 10,
              borderRadius: 8,
              fontWeight: 700,
              border: 'none',
            }}
          >
            Login
          </button>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              background: '#333',
              color: TXT,
              padding: 10,
              borderRadius: 8,
              border: 'none',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
// ── Admin View ─────────────────────────────────────────────────────────────────
function AdminView({ pending, handleApprove, onReject, switchToCustomer }) {
  console.log("AdminView props received:", { handleApprove });
  return (
    <div>
      <div
        style={{
          background: BK,
          borderBottom: '1px solid #2a2a2a',
          padding: '14px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1
          style={{ margin: 0, color: '#16a34a', fontSize: 20, fontWeight: 900 }}
        >
          🛡️ Admin Dashboard
        </h1>
        <button
          onClick={switchToCustomer}
          style={{
            background: '#333',
            color: TXT,
            border: 'none',
            padding: '6px 12px',
            borderRadius: 8,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Back to App
        </button>
      </div>
      <div style={{ padding: 16, maxWidth: 960, margin: '0 auto' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16 }}>
          Pending Community Routes ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <div
            style={{
              color: MUTED,
              textAlign: 'center',
              padding: 40,
              background: CARD,
              borderRadius: 12,
            }}
          >
            No pending routes.
          </div>
        ) : (
          pending.map((r) => (
            <div
              key={r.id}
              style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 700, color: TXT }}>{r.name}</div>
                <TypeBadge type={r.type} />
              </div>
              <div style={{ fontSize: 12, color: MUTED, margin: '8px 0' }}>
                Stops: {r.stops.join(' → ')}
                <br />
                💰 {r.fare} | 🔄 {r.freq} | 🕒 {r.hours}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                  onClick={() => handleApprove(r)}
                  style={{
                    flex: 1,
                    background: '#16a34a',
                    color: '#fff',
                    border: 'none',
                    padding: '8px',
                    borderRadius: 6,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ✅ Approve
                </button>
                <button
                  onClick={() => onReject(r.id)}
                  style={{
                    flex: 1,
                    background: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    padding: '8px',
                    borderRadius: 6,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ❌ Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Main Controller Component ──────────────────────────────────────────────────
export default function App() {
  const [showEditModal, setShowEditModal] = useState(false);
  
  // CHANGED: 'fare' is now 'fares' to match your modal input
  const [suggestedEdit, setSuggestedEdit] = useState({ 
    routeName: "", 
    searchQuery: "", 
    fares: "", 
    frequency: "", 
    hours: "", 
    landmarks: "" 
  });

  // 1. THIS LET'S YOU TYPE IN THE BOXES AGAIN
  const handleEditChange = (e) => {
    setSuggestedEdit({
      ...suggestedEdit,
      [e.target.name]: e.target.value
    });
  };

  // 2. THIS IS THE ACTUAL SUBMIT BUTTON LOGIC
  const handleSubmitEdit = async () => {
    if (!suggestedEdit.routeId) {
      alert("Please select a route first!");
      return;
    }

    try {
      // NEW: Convert the comma-separated string into an array of numbers
      // NEW: Convert the string into an array, and auto-add the 0 at the start!
      let parsedFares = null;
      if (suggestedEdit.fares && typeof suggestedEdit.fares === 'string') {
        // 1. Turn what the user typed (e.g. "20, 30") into an array
        const userEnteredFares = suggestedEdit.fares.split(',').map(f => Number(f.trim()));
        
        // 2. Slap a 0 at the very front for the starting point!
        parsedFares = [0, ...userEnteredFares];
      }

      // Build the clean object to send to Firebase
      const editData = {
        routeId: suggestedEdit.routeId,
        routeName: suggestedEdit.routeName,
        fares: parsedFares || "No change", // Sending the array here!
        frequency: suggestedEdit.frequency || "No change",
        hours: suggestedEdit.hours || "No change",
        landmarks: suggestedEdit.landmarks || "No change",
        status: "pending",
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'pending_edits'), editData);
      
      setToast({ msg: '✅ Edit submitted for review!', color: '#22C55E', textColor: '#FFF' });
      setShowEditModal(false); 
      setTimeout(() => {
        setToast(null); 
      }, 3000);
      
    } catch (error) {
      console.error("Firebase Edit Error:", error);
      setToast({ msg: '❌ Failed to submit edit. Check connection.', color: '#dc2626', textColor: '#FFF' });
      setTimeout(() => {
        setToast(null); 
      }, 3000);
    }
  };

  const [view, setView] = useState('customer');
  const [adminMode, setAdminMode] = useState(false);
  const [approvedRoutes, setApprovedRoutes] = useState([]);
  const [pendingRoutes, setPendingRoutes] = useState([]);
  const [deletedBaseIds, setDeletedBaseIds] = useState(new Set());
  const [toast, setToast] = useState(null);

  const showToast = (msg, color = '#FFD700', textColor = '#000') => {
    setToast({ msg, color, textColor });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const unsubApproved = onSnapshot(
      collection(db, 'approved_routes'),
      (snapshot) =>
        setApprovedRoutes(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubPending = onSnapshot(
      collection(db, 'pending_routes'),
      (snapshot) =>
        setPendingRoutes(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubDeleted = onSnapshot(
      collection(db, 'deleted_base_routes'),
      (snapshot) =>
        setDeletedBaseIds(new Set(snapshot.docs.map((d) => parseInt(d.id))))
    );
    return () => {
      unsubApproved();
      unsubPending();
      unsubDeleted();
    };
  }, []);

  const allRoutes = useMemo(() => {
    // 1. Organize all approved Firebase routes (both new routes and edits) by their ID
    const firestoreRoutesMap = new Map();
    approvedRoutes.forEach(route => firestoreRoutesMap.set(route.id.toString(), route));

    // 2. Loop through your hardcoded BASE_ROUTES
    const mergedBaseRoutes = BASE_ROUTES
      .filter((r) => !deletedBaseIds.has(r.id))
      .map((baseRoute) => {
        const stringId = baseRoute.id.toString();
        
        // If this base route has an approved edit in Firebase, merge the edits IN!
        if (firestoreRoutesMap.has(stringId)) {
          const edits = firestoreRoutesMap.get(stringId);
          firestoreRoutesMap.delete(stringId); // Remove it so it doesn't duplicate later
          
          // This overwrites the old base data with your new edited arrays
          return { ...baseRoute, ...edits }; 
        }
        
        // No edits? Just return the normal base route
        return baseRoute; 
      });

    // 3. Combine the newly merged base routes with any completely new community routes
    return [...mergedBaseRoutes, ...Array.from(firestoreRoutesMap.values())];
  }, [approvedRoutes, deletedBaseIds]);

  const handleSubmitRoute = async (r) => {
    const sanitizedRoute = { ...r };
    
    Object.keys(sanitizedRoute).forEach(key => {
      if (sanitizedRoute[key] === undefined) delete sanitizedRoute[key];
      if (Array.isArray(sanitizedRoute[key])) {
        sanitizedRoute[key] = sanitizedRoute[key].flat(Infinity);
      }
    });

    // ==========================================
    // 🧠 SMART REVERSE MATCHER
    // ==========================================
    if (sanitizedRoute.stops && Array.isArray(sanitizedRoute.stops)) {
      const newStops = sanitizedRoute.stops;
      
      // Look for an existing route that matches these stops exactly, but backwards
      const existingReverseRoute = allRoutes.find(existingRoute => {
        if (!existingRoute.stops || existingRoute.stops.length !== newStops.length) return false;
        
        const flippedExistingStops = [...existingRoute.stops].reverse();
        return flippedExistingStops.every((stop, index) => 
          stop.toLowerCase().trim() === newStops[index].toLowerCase().trim()
        );
      });

      // If we found a match AND it has valid map data, hijack it!
      if (existingReverseRoute && existingReverseRoute.path && existingReverseRoute.path.length > 0) {
        console.log("Reverse route found! Stealing and flipping the map data...");
        
        // Instantly populate the map data by reversing the existing one
        sanitizedRoute.stopCoords = [...existingReverseRoute.stopCoords].reverse();
        sanitizedRoute.path = [...existingReverseRoute.path].reverse();

        // Submit to Firebase immediately and exit the function
        try {
          await addDoc(collection(db, 'pending_routes'), sanitizedRoute);
          showToast('✅ Reverse route matched and submitted to Admin!', '#16a34a', '#fff');
        } catch (fbErr) {
          alert("Database Error: " + fbErr.message); 
        }
        return; // <--- CRITICAL: Stops the function so no API calls are made!
      }
    }
    // ==========================================


    // NEW: Array to permanently store the exact GPS for every stop!
    sanitizedRoute.stopCoords = new Array(sanitizedRoute.stops?.length || 0).fill(null);

    try {
      const routeCoords = [];

      // A. Grab the starting GPS pin
      if (sanitizedRoute.lat && sanitizedRoute.lng) {
        routeCoords.push(`${sanitizedRoute.lng},${sanitizedRoute.lat}`);
        sanitizedRoute.stopCoords[0] = { lat: sanitizedRoute.lat, lng: sanitizedRoute.lng };
      }

      // B. LIVE GEOCODING
      if (sanitizedRoute.stops && Array.isArray(sanitizedRoute.stops)) {
        for (let i = 0; i < sanitizedRoute.stops.length; i++) {
          if (i === 0 && sanitizedRoute.lat) continue;

          const stopName = sanitizedRoute.stops[i];
          if (!stopName) continue;

          try {
            // Updated to be simpler so Nominatim doesn't get confused!
            const searchQuery = encodeURIComponent(`${stopName}, Maharashtra, India`);
            const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}&limit=1&viewbox=72.75,19.50,73.40,18.90&bounded=1`;
            
            const geoRes = await fetch(geoUrl);
            const geoData = await geoRes.json();

            if (geoData && geoData.length > 0) {
              const lon = Number(geoData[0].lon);
              const lat = Number(geoData[0].lat);
              
              routeCoords.push(`${lon},${lat}`);
              
              // SAVE THE EXACT GPS FOR THIS SPECIFIC STOP!
              sanitizedRoute.stopCoords[i] = { lat, lng: lon };
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (geoErr) {
            console.error("Geocoding failed for", stopName, geoErr);
          }
        }
      }

      // C. FETCH CURVY ROADS
      if (routeCoords.length > 1) {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${routeCoords.join(';')}?overview=full&geometries=geojson`;
        const res = await fetch(osrmUrl);
        const data = await res.json();

        if (data.routes && data.routes[0] && data.routes[0].geometry) {
          sanitizedRoute.path = data.routes[0].geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
        }
      }
    } catch (err) {
      console.warn("Curve generation skipped due to error, but saving route anyway:", err);
    }

    try {
      await addDoc(collection(db, 'pending_routes'), sanitizedRoute);
      showToast('✅ Route submitted to Admin for review!', '#16a34a', '#fff');
    } catch (fbErr) {
      alert("Database Error: " + fbErr.message); 
    }
  };

  const handleDelete = async (id) => {
    if (BASE_ROUTES.some((r) => r.id === id)) {
      await setDoc(doc(db, 'deleted_base_routes', id.toString()), {
        deleted: true,
      });
    } else {
      await deleteDoc(doc(db, 'approved_routes', id.toString()));
    }
    showToast('🗑️ Route removed globally.', '#dc2626', TXT);
  };

  const handleApprove = async (r) => {
    console.log("FULL ROUTE OBJECT RECEIVED:", r);
    
    if (!r || !r.id) {
      console.error("CRITICAL ERROR: Route object is empty or missing ID!");
      alert("Error: Route is missing an ID. Check your data structure.");
      return;
    }
  
    try {
      console.log("Attempting to write to Firestore...");
      await setDoc(doc(db, 'approved_routes', r.id), { ...r, community: true });
      await deleteDoc(doc(db, 'pending_routes', r.id));
      
      setPendingRoutes(prev => prev.filter(item => item.id !== r.id));
      showToast('✅ Route published live!');
    } catch (error) {
      console.error("FIREBASE WRITE ERROR:", error);
      alert("Firestore Error: " + error.message);
    }
  };
  const handleApproveEdit = async (edit) => {
    try {
      // 1. Point to the specific route in the database using the routeId
      // We convert it to a string just in case it's a number from BASE_ROUTES
      const routeRef = doc(db, 'approved_routes', edit.routeId.toString());

      // 2. Build our update object. 
      // We only want to overwrite the data if the user actually typed a new value.
      const updates = {};
      if (edit.fares !== "No change") updates.fares = edit.fares; // This safely writes your new array!
      if (edit.frequency !== "No change") updates.freq = edit.frequency;
      if (edit.hours !== "No change") updates.hours = edit.hours;
      
      // 3. Update the main route document 
      // { merge: true } is CRITICAL here—it ensures we don't accidentally delete the route's coordinates or stops!
      await setDoc(routeRef, updates, { merge: true });

      // 4. Delete the pending edit request now that it has been applied
      await deleteDoc(doc(db, 'pending_edits', edit.id));

      showToast('✅ Route edit applied successfully!', '#16a34a', '#fff');
    } catch (error) {
      console.error("Error approving edit:", error);
      alert("Error applying edit: " + error.message);
    }
  };

  const handleReject = async (id) => {
    await deleteDoc(doc(db, 'pending_routes', id.toString()));
    showToast('❌ Request rejected.', '#dc2626', TXT);
  };

  return (
    <div
      style={{
        fontFamily: 'system-ui,sans-serif',
        background: '#000000', // Replaced DK just to be safe
        minHeight: '100vh',
        color: '#FFFFFF', // Replaced TXT just to be safe
      }}
    >
      <Toast toast={toast} />
      
      {view === 'login' && (
        <AdminLoginModal
          onSuccess={() => {
            setAdminMode(true);
            setView('admin');
          }}
          onCancel={() => setView('customer')}
        />
      )}
      
      {view === 'admin' ? (
  <AdminDashboard 
    pendingRoutes={pendingRoutes} 
    onApproveRoute={handleApprove} 
    onRejectRoute={handleReject} 
    onApproveEdit={handleApproveEdit}
    onBack={() => {
      setAdminMode(false); // Optional: Logs them out of admin mode when they leave
      setView('customer');
    }} 
  />
) : (
  <CustomerView 
    allRoutes={allRoutes}
    pendingCount={pendingRoutes.length}
    onAddRoute={handleSubmitRoute}
    onDeleteRoute={handleDelete}
    onAdminClick={() => {
      adminMode ? setView('admin') : setView('login');
    }}
    adminMode={adminMode}
    setAdminMode={setAdminMode}
    showToast={showToast}
    setShowEditModal={setShowEditModal}
  />
)}

      <SuggestEditModal
        show={showEditModal}
        suggestedEdit={suggestedEdit}
        setShowEditModal={setShowEditModal}
        handleEditChange={handleEditChange} // Added this line!
        onSubmitEdit={handleSubmitEdit}
        allRoutes={allRoutes}         // <--- ADD THIS LINE!
  setSuggestedEdit={setSuggestedEdit} // <--- ADD THIS LINE too!
      />
      <Analytics />
    </div>
  );
}
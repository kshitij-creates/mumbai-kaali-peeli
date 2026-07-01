import React, { useState, useMemo, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, deleteDoc, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// ── ⚠️ FIREBASE SETUP ────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyAuca_BbRV27xRnxmPJKJviaSQGj3lfnGo",
  authDomain: "mumbai-kaali-peeli.firebaseapp.com",
  projectId: "mumbai-kaali-peeli",
  storageBucket: "mumbai-kaali-peeli.firebasestorage.app",
  messagingSenderId: "115301776166",
  appId: "1:115301776166:web:bd0087822b76e831351fe7",
  measurementId: "G-XRKK35KYGZ"
};

// 1. Initialize Firebase App (only if it hasn't been initialized already)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 2. Initialize Firestore Database (Standard connection)
const db = getFirestore(app, 'default');

// ── THE GEOCODING BRAIN 🧠 ───────────────────────────────────────────────────
const fetchCoordinates = async (placeName) => {
  const query = `${placeName}, Maharashtra, India`;
  const viewbox = "72.75,20.15,73.90,18.90"; // Prioritize Mumbai/Thane/Kalyan
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=${viewbox}&bounded=0`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    return null;
  } catch (err) {
    console.error("Failed to find location:", err);
    return null;
  }
};
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
  share_taxi: { l: '🚕 Share Taxi', color: Y, bg: '#2A2400' },
  auto: { l: '🛺 Auto', color: '#22c55e', bg: '#062a14' },
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

// ── UTILS & MINOR COMPONENTS ──────────────────────────────────────────────────
const Stripe = () => (
  <div
    style={{ height: 12, display: 'flex', width: '100%', overflow: 'hidden' }}
  >
    {Array.from({ length: 40 }).map((_, i) => (
      <div
        key={i}
        style={{
          flex: 1,
          background: i % 2 === 0 ? Y : BK,
          transform: 'skew(-45deg)',
          marginLeft: -5,
          width: 20,
        }}
      />
    ))}
  </div>
);
const TypeBadge = ({ type }) => (
  <div
    style={{
      background: META[type].bg,
      color: META[type].color,
      border: `1px solid ${META[type].color}55`,
      fontSize: 10,
      fontWeight: 800,
      padding: '4px 8px',
      borderRadius: 20,
      whiteSpace: 'nowrap',
    }}
  >
    {META[type].l}
  </div>
);

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

// ── V2: Dynamic Add Route Form ────────────────────────────────────────────────
function AddRouteForm({ onSubmit, onClose }) {
  const [stopsList, setStopsList] = useState([]);
  const [currentStop, setCurrentStop] = useState('');
  const [otherInfo, setOtherInfo] = useState({
    type: 'share_taxi',
    fare: '',
    freq: '',
    hours: '',
  });
  const [isSearching, setIsSearching] = useState(false);

  const addStop = () => {
    if (currentStop.trim()) {
      setStopsList([...stopsList, currentStop.trim()]);
      setCurrentStop('');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (stopsList.length < 2) return alert('Please add at least 2 stops!');

    setIsSearching(true);
    const stopCoords = [];
    for (const name of stopsList) {
      const coords = await fetchCoordinates(name);
      if (coords) stopCoords.push([coords.lat, coords.lng]);
    }

    // Auto-generate name: "First Stop → Last Stop"
    const routeName = `${stopsList[0]} → ${stopsList[stopsList.length - 1]}`;

    onSubmit({
      ...otherInfo,
      name: routeName,
      stops: stopsList,
      path: stopCoords.length > 1 ? stopCoords : null,
    });
    setIsSearching(false);
    onClose();
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
          padding: 20,
          borderRadius: 16,
          border: `1px solid ${BORDER}`,
          width: '100%',
          maxWidth: 400,
        }}
      >
        <h2 style={{ margin: '0 0 16px', color: Y }}>Add New Route</h2>
        <form
          onSubmit={submit}
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <select
            value={otherInfo.type}
            onChange={(e) =>
              setOtherInfo({ ...otherInfo, type: e.target.value })
            }
            style={inp}
          >
            <option value="share_taxi">🚕 Share Taxi</option>
            <option value="auto">🛺 Auto</option>
          </select>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="Add stop (e.g. Bandra)"
              value={currentStop}
              onChange={(e) => setCurrentStop(e.target.value)}
              style={inp}
            />
            <button
              type="button"
              onClick={addStop}
              style={{
                background: Y,
                border: 'none',
                borderRadius: 8,
                padding: '0 15px',
                fontWeight: 900,
              }}
            >
              +
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {stopsList.map((s, i) => (
              <span
                key={i}
                style={{
                  background: '#333',
                  padding: '4px 10px',
                  borderRadius: 12,
                  fontSize: 12,
                }}
              >
                {s}
              </span>
            ))}
          </div>

          <input
            required
            placeholder="Fare (e.g. ₹15-20)"
            value={otherInfo.fare}
            onChange={(e) =>
              setOtherInfo({ ...otherInfo, fare: e.target.value })
            }
            style={inp}
          />
          <input
            required
            placeholder="Frequency (e.g. Every 5 mins)"
            value={otherInfo.freq}
            onChange={(e) =>
              setOtherInfo({ ...otherInfo, freq: e.target.value })
            }
            style={inp}
          />
          <input
            required
            placeholder="Hours (e.g. 6 AM - 11 PM)"
            value={otherInfo.hours}
            onChange={(e) =>
              setOtherInfo({ ...otherInfo, hours: e.target.value })
            }
            style={inp}
          />

          <button
            type="submit"
            disabled={isSearching}
            style={{
              marginTop: 10,
              background: isSearching ? '#888' : Y,
              color: BK,
              padding: 12,
              borderRadius: 8,
              fontWeight: 700,
              border: 'none',
            }}
          >
            {isSearching ? 'Mapping...' : 'Create Route'}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#333',
              color: TXT,
              padding: 12,
              borderRadius: 8,
              border: 'none',
            }}
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}

// ── RouteCard ──────────────────────────────────────────────────────────────────
function RouteCard({ route, selected, onSelect, distance, onDelete, isAdmin }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const m = META[route.type];
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
            gap: 10,
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
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
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
            paddingRight: isAdmin ? 32 : 0,
          }}
        >
          {route.name}
        </div>
        <TypeBadge type={route.type} />
      </div>
      {isAdmin && (
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
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginTop: 7,
          fontSize: 12,
          color: MUTED,
        }}
      >
        <span>💰 {route.fare}</span>
        <span>🔄 {route.freq}</span>
        {distLabel && (
          <span style={{ color: Y, fontWeight: 700 }}>📍 {distLabel} away</span>
        )}
      </div>
      {selected && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: `1px solid ${m.color}33`,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 5,
              marginBottom: 8,
            }}
          >
            {route.stops.map((s, i) => (
              <span
                key={i}
                style={{
                  background: '#252525',
                  color: '#ddd',
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 10,
                }}
              >
                {s}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#aaa' }}>{route.hours}</div>
        </div>
      )}
    </div>
  );
}

// ── V2: Dynamic MapView ────────────────────────────────────────────────────────
function MapView({ routes, selectedId, onSelect, userLoc }) {
  const sel = routes.find((r) => r.id === selectedId);

  // V2 Update: Check if route has dynamic API 'path' data first, otherwise fall back to COORDS dictionary
  const lineCoords = useMemo(() => {
    if (!sel) return [];
    if (sel.path && sel.path.length > 0) return sel.path;
    return sel.stops
      .map((s) => COORDS[s])
      .filter(Boolean)
      .map((c) => [c.lat, c.lng]);
  }, [sel]);

  const allMarkers = useMemo(() => {
    const m = [];
    routes.forEach((r) => {
      if (r.path && r.path.length === r.stops.length) {
        r.stops.forEach((s, i) => m.push({ name: s, pos: r.path[i] }));
      } else {
        r.stops.forEach((s) => {
          if (COORDS[s] && !m.some((x) => x.name === s))
            m.push({ name: s, pos: [COORDS[s].lat, COORDS[s].lng] });
        });
      }
    });
    return m;
  }, [routes]);

  return (
    <div
      style={{
        height: 400,
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        border: `2px solid ${BORDER}`,
      }}
    >
      <MapContainer
        center={[19.1136, 72.8697]}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap"
        />
        {userLoc && (
          <CircleMarker
            center={[userLoc.lat, userLoc.lng]}
            radius={8}
            pathOptions={{
              color: '#fff',
              fillColor: '#3b82f6',
              fillOpacity: 1,
            }}
          >
            <Popup>You are here</Popup>
          </CircleMarker>
        )}
        {sel && lineCoords.length > 1 && (
          <Polyline
            positions={lineCoords}
            pathOptions={{ color: META[sel.type].color, weight: 4 }}
          />
        )}
        {allMarkers.map((m, i) => (
          <CircleMarker
            key={i}
            center={m.pos}
            radius={5}
            pathOptions={{
              color: '#000',
              fillColor: sel?.stops.includes(m.name)
                ? META[sel.type].color
                : '#fff',
              fillOpacity: 1,
            }}
          >
            <Popup>{m.name}</Popup>
          </CircleMarker>
        ))}
      </MapContainer>
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

// ── Customer View ──────────────────────────────────────────────────────────────
function CustomerView({
  allRoutes,
  pendingCount,
  onAddRoute,
  onDeleteRoute,
  onAdminClick,
  isAdmin,
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState('list');
  const [showForm, setShowForm] = useState(false);
  const [nearMe, setNearMe] = useState(null);

  const handleNearMe = () => {
    if (nearMe) {
      setNearMe(null);
      return;
    }
    navigator.geolocation.getCurrentPosition((pos) =>
      setNearMe({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    );
  };

  const filtered = useMemo(() => {
    return allRoutes.filter((r) => {
      if (filter !== 'all' && r.type !== filter) return false;
      return (
        !search ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.stops.some((s) => s.toLowerCase().includes(search.toLowerCase()))
      );
    });
  }, [allRoutes, search, filter]);

  return (
    <div>
      <div style={{ background: BK, borderBottom: '1px solid #2a2a2a' }}>
        <Stripe />
        <div
          style={{
            padding: '14px 16px',
            maxWidth: 960,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h1 style={{ margin: 0, color: Y, fontSize: 20, fontWeight: 900 }}>
              🚕 Mumbai Kaali-Peeli
            </h1>
          </div>
          <button
            onClick={onAdminClick}
            style={{
              background: isAdmin ? '#16a34a' : '#1a1a1a',
              color: isAdmin ? '#fff' : Y,
              border: isAdmin ? 'none' : `1.5px solid ${Y}44`,
              padding: '6px 12px',
              borderRadius: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            🛡️ {isAdmin ? 'Admin Mode' : 'Admin'}{' '}
            {pendingCount > 0 && `(${pendingCount})`}
          </button>
        </div>
        <div
          style={{ padding: '0 16px 14px', maxWidth: 960, margin: '0 auto' }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stops (e.g. Andheri, Bandra...)"
            style={inp}
          />
        </div>
        <Stripe />
      </div>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: 12 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {['all', 'share_taxi', 'auto'].map((v) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              style={{
                padding: '6px 12px',
                borderRadius: 12,
                background: filter === v ? Y : CARD,
                color: filter === v ? BK : MUTED,
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {v === 'all' ? 'All' : v === 'auto' ? 'Auto' : 'Taxi'}
            </button>
          ))}
          <button
            onClick={handleNearMe}
            style={{
              background: nearMe ? '#0f172a' : CARD,
              color: nearMe ? '#60a5fa' : MUTED,
              padding: '6px 12px',
              borderRadius: 12,
              border: 'none',
              marginLeft: 'auto',
              cursor: 'pointer',
            }}
          >
            📍 Near Me
          </button>
          <button
            onClick={() => setShowForm(true)}
            style={{
              background: Y,
              color: BK,
              padding: '6px 12px',
              borderRadius: 12,
              border: 'none',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            ➕ Add
          </button>
        </div>
        <div
          style={{
            display: 'flex',
            background: '#161616',
            borderRadius: 12,
            padding: 3,
            marginBottom: 12,
          }}
        >
          {[
            ['list', '📋 List'],
            ['map', '🗺️ Map'],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              style={{
                flex: 1,
                padding: 6,
                background: tab === v ? Y : 'transparent',
                color: tab === v ? BK : MUTED,
                border: 'none',
                borderRadius: 10,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {l}
            </button>
          ))}
        </div>
        {tab === 'list' ? (
          filtered.map((r) => (
            <RouteCard
              key={r.id}
              route={r}
              selected={selectedId === r.id}
              onSelect={() => setSelectedId((p) => (p === r.id ? null : r.id))}
              onDelete={onDeleteRoute}
              isAdmin={isAdmin}
            />
          ))
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            <MapView
              routes={filtered}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId((p) => (p === id ? null : id))}
              userLoc={nearMe}
            />
            <div style={{ marginTop: 8 }}>
              {filtered.map((r) => (
                <RouteCard
                  key={r.id}
                  route={r}
                  selected={selectedId === r.id}
                  onSelect={() =>
                    setSelectedId((p) => (p === r.id ? null : id))
                  }
                  onDelete={onDeleteRoute}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      {showForm && (
        <AddRouteForm
          onSubmit={onAddRoute}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

// ── Main Controller Component ──────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState('customer');
  const [isAdmin, setIsAdmin] = useState(false);
  const [approvedRoutes, setApprovedRoutes] = useState([]);
  const [pendingRoutes, setPendingRoutes] = useState([]);
  const [deletedBaseIds, setDeletedBaseIds] = useState(new Set());
  const [toast, setToast] = useState(null);

  const showToast = (msg, color = Y, textColor = BK) => {
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

  const allRoutes = useMemo(
    () => [
      ...BASE_ROUTES.filter((r) => !deletedBaseIds.has(r.id)),
      ...approvedRoutes,
    ],
    [approvedRoutes, deletedBaseIds]
  );

  const handleSubmitRoute = async (r) => {
    // 1. Create a clean copy of the route data
    const sanitizedRoute = { ...r };
  
    // 2. Hunt down any arrays and smash them flat!
    Object.keys(sanitizedRoute).forEach(key => {
      if (Array.isArray(sanitizedRoute[key])) {
        sanitizedRoute[key] = sanitizedRoute[key].flat(Infinity);
      }
    });
  
    // --- THE NEW WIRING: FETCH GPS DATA ---
    // Assuming the user typed the stops into an array like stops: ["Majiwada", "Thane Station"]
    if (sanitizedRoute.stops && sanitizedRoute.stops.length >= 2) {
      try {
        console.log("Fetching GPS coordinates for:", sanitizedRoute.stops);
        
        // Fetch coordinates for the first stop and last stop
        const startCoords = await fetchCoordinates(sanitizedRoute.stops[0]);
        const endCoords = await fetchCoordinates(sanitizedRoute.stops[sanitizedRoute.stops.length - 1]);
  
        // If both succeeded, attach them to the route as a 'path' array
        if (startCoords && endCoords) {
          sanitizedRoute.path = [startCoords, endCoords];
          console.log("Coordinates successfully attached!", sanitizedRoute.path);
        } else {
          console.warn("Geocoding failed for one or both stops. Saving text only.");
        }
      } catch (error) {
        console.error("Geocoding error during submission:", error);
      }
    }
    // ---------------------------------------
  
    // 3. Send the clean, geocoded data to Firebase
    await addDoc(collection(db, 'pending_routes'), sanitizedRoute);
    showToast('✅ Route submitted to Firebase cloud!');
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
  const handleReject = async (id) => {
    await deleteDoc(doc(db, 'pending_routes', id.toString()));
    showToast('❌ Request rejected.', '#dc2626', TXT);
  };

  return (
    <div
      style={{
        fontFamily: 'system-ui,sans-serif',
        background: DK,
        minHeight: '100vh',
        color: TXT,
      }}
    >
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 400,
            background: toast.color,
            color: toast.textColor,
            padding: '10px 20px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          {toast.msg}
        </div>
      )}
      {view === 'login' && (
        <AdminLoginModal
          onSuccess={() => {
            setIsAdmin(true);
            setView('admin');
          }}
          onCancel={() => setView('customer')}
        />
      )}
      {view === 'admin' ? (
      <AdminView
      pending={pendingRoutes}
      handleApprove={handleApprove}
      onReject={handleReject}
      switchToCustomer={() => setView('customer')}
    />
      ) : (
        <CustomerView
          allRoutes={allRoutes}
          pendingCount={pendingRoutes.length}
          onAddRoute={handleSubmitRoute}
          onDeleteRoute={handleDelete}
          onAdminClick={() => {
            isAdmin ? setView('admin') : setView('login');
          }}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

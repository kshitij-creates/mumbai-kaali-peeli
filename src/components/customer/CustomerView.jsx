import React, { useState, useMemo, useEffect } from 'react';
import RouteCard from './RouteCard'; 

// Make sure to import these if they are extracted into their own files!
// import MapView from '../map/MapView'; 
// import AddRouteForm from '../admin/AddRouteForm'; 

import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import autoIcon from '../../assets/auto.svg';
import { COORDS } from '../../data';
import { db } from '../../firebase/config';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import FaqModal from '../modals/FaqModal';

// --- THEME COLORS & STYLES (Moved outside so all components can use them) ---
const Y = '#EAB308';   
const BK = '#000000';  
const TXT = '#FFFFFF'; 
const DK = '#111111';  
const R = '#EF4444';   
const G = '#22C55E';   
const CARD = '#1A1A1A'; 
const MUTED = '#888888';
// Add these constants
const BORDER = '#333';
const META = {
  share_taxi: { color: '#EAB308' },
  auto: { color: '#22C55E' }
};
const translations = {
  EN: {
    // Top Bar & Filters
    search: "Search stops (e.g. Andheri, Bandra...)",
    all: "All",
    taxi: "Taxi",
    auto: "Auto",
    nearMe: "Near Me",
    
    // Bottom Toggles
    list: "List",
    map: "Map",

    // Menu / Drawer
    menu: "Menu",
    liveChat: "Live Chat",
    featuresGuide: "Features Guide",
    contactUs: "Contact Us",
    language: "Language",

    // Secret Route Box (in drawer)
    secretTitle: (
      <>
        Know a local route that isn't on the map? Spill the secret! 🤫
        <span style={{ display: 'block', fontSize: '12px', color: '#777', marginTop: '6px', fontStyle: 'italic' }}>
          (route will be reviewed)
        </span>
      </>
    ),
    addRoute: "+ Add route",
    suggestEdit: "Suggest Edit",

    // Route Cards
    every: "every",
    mins: "mins",

    // General Actions
    close: "Close",
    cancel: "Cancel"
  },
  
  HI: {
    // Top Bar & Filters
    search: "स्टॉप खोजें (जैसे अंधेरी, बांद्रा...)",
    all: "सभी",
    taxi: "टैक्सी",
    auto: "ऑटो",
    nearMe: "आसपास",
    
    // Bottom Toggles
    list: "लिस्ट",
    map: "मैप",

    // Menu / Drawer
    menu: "मेनू",
    liveChat: "लाइव चैट",
    featuresGuide: "फीचर्स गाइड",
    contactUs: "संपर्क करें",
    language: "भाषा",

    // Secret Route Box (in drawer)
    secretTitle: "कोई सीक्रेट रूट पता है? हमारे साथ शेयर करें!",
    addRoute: "+ रूट जोड़ें",
    suggestEdit: "सुधार सुझाएं",

    // Route Cards
    every: "हर",
    mins: "मिनट",

    // General Actions
    close: "बंद करें",
    cancel: "रद्द करें"
  },
  
  MR: {
    // Top Bar & Filters
    search: "थांबे शोधा (उदा. अंधेरी, वांद्रे...)",
    all: "सर्व",
    taxi: "टॅक्सी",
    auto: "रिक्षा",
    nearMe: "माझ्या जवळ",
    
    // Bottom Toggles
    list: "यादी",
    map: "नकाशा",

    // Menu / Drawer
    menu: "मेनू",
    liveChat: "लाईव्ह चॅट",
    featuresGuide: "अॅपची माहिती",
    contactUs: "संपर्क साधा",
    language: "भाषा",

    // Secret Route Box (in drawer)
    secretTitle: "एखादा नवीन मार्ग माहीत आहे? आम्हाला नक्की सांगा!",
    addRoute: "+ मार्ग जोडा",
    suggestEdit: "बदल सुचवा",

    // Route Cards
    every: "दर",
    mins: "मिनिटे",

    // General Actions
    close: "बंद करा",
    cancel: "रद्द करा"
  }
};

const inp = {
  width: '100%',
  padding: '14px 14px 14px 44px', // Extra left padding for the Shimeji cars
  borderRadius: '8px',
  border: '1px solid #333',
  background: '#111',
  color: '#FFF',
  outline: 'none',
  boxSizing: 'border-box'
};

// Fallback dictionary to prevent crashes. (If COORDS is in another file, import it!)
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

function AddRouteForm({ onSubmit, onClose }) {
  const [stopsList, setStopsList] = useState([]);
  const [currentStop, setCurrentStop] = useState('');
  const [faresList, setFaresList] = useState([]); // NEW: Tracks the list of prices
  const [currentFare, setCurrentFare] = useState(''); // NEW: Tracks the price currently being typed
  const [otherInfo, setOtherInfo] = useState({
    type: 'share_taxi',
    fare: '',
    freq: '',
    hours: '',
    landmarks: '',
  });
  const [isSearching, setIsSearching] = useState(false);

  const addStop = () => {
    if (currentStop.trim()) {
      setStopsList([...stopsList, currentStop.trim()]);
      // Push the fare, or default to 'TBD' if they left it blank
      setFaresList([...faresList, currentFare.trim() || 'TBD']); 
      
      setCurrentStop('');
      setCurrentFare(''); // Reset the fare input for the next stop
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (stopsList.length < 2) return alert('Please add at least 2 stops!');

    setIsSearching(true);

    // Grab the first stop (pickup point) to place the map pin
   // Fetch coordinates for every single stop in the list automatically
// Fetch coordinates sequentially so the API doesn't block us!
const allCoords = [];
for (const stopName of stopsList) {
  try {
    const coords = await fetchCoordinates(stopName);
    allCoords.push(coords ? coords : { lat: 19.2183, lng: 72.9781 });
  } catch (error) {
    // If one fails, push the fallback so the app doesn't crash
    allCoords.push({ lat: 19.2183, lng: 72.9781 });
  }
}
// Safely grab the very first stop's coordinates for the old logic
const mainCoords = allCoords[0] || { lat: 19.2183, lng: 72.9781 };
    const newRoute = {
      type: otherInfo.type,
      name: stopsList.join(' → '),
      stops: stopsList,
      fares: faresList,
      stopCoordinates: allCoords,
      frequency: otherInfo.freq,
      hours: otherInfo.hours,
      landmarks: otherInfo.landmarks,
      // Add the new coordinates, with a fallback just in case the API fails
      lat: mainCoords.lat, 
      lng: mainCoords.lng, 
    };

    // Pass the newly built route up to the parent component to save it
    onSubmit(newRoute);
    
    setIsSearching(false);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div className="cyber-modal" style={{ width: '100%', maxWidth: 400 }}>
        <h2 style={{ margin: '0 0 16px', color: '#FFD700' }}>Add New Route</h2>
        <form
          onSubmit={submit}
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <select
            value={otherInfo.type}
            onChange={(e) => setOtherInfo({ ...otherInfo, type: e.target.value })}
            className="cyber-input"
          >
            <option value="share_taxi">🚕 Share Taxi</option>
            <option value="auto">🛺 Auto</option>
          </select>

          <div style={{ display: 'flex', gap: 8 }}>
          <input
        placeholder="Add stop (e.g. Bandra)"
        value={currentStop}
        onChange={(e) => setCurrentStop(e.target.value)}
        className="cyber-input"
      />
      
      {/* Only show Fare input IF they already added a starting point */}
      {stopsList.length > 0 && (
        <input 
          required={false}
          type="number" 
          placeholder="Fare (₹)" 
          value={currentFare} 
          onChange={(e) => setCurrentFare(e.target.value)} 
          style={{ width: '90px' }}
          className="cyber-input"
        />
      )}

      <button
        type="button"
              onClick={addStop}
              className="tactile-btn"
              style={{
                background: '#FFD700',
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
    <span key={i} style={{ background: '#333', padding: '4px 10px', borderRadius: 12, fontSize: '12px' }}>
      {/* If it is the first stop (index 0), just show the name. Otherwise, show name + fare! */}
      {i === 0 ? `📍 Start: ${s}` : `${s} - `}
      
      {i > 0 && <span style={{ color: '#ef4444' }}>₹{faresList[i]}</span>}
    </span>
  ))}
</div>

          <input required placeholder="Frequency (e.g. Every 5 mins)" value={otherInfo.freq} onChange={(e) => setOtherInfo({ ...otherInfo, freq: e.target.value })} className="cyber-input" />
          <input required placeholder="Hours (e.g. 6 AM - 11 PM)" value={otherInfo.hours} onChange={(e) => setOtherInfo({ ...otherInfo, hours: e.target.value })} className="cyber-input" />
          <input 
            placeholder="Nearby Landmarks (Optional)" 
            value={otherInfo.landmarks} 
            onChange={(e) => setOtherInfo({ ...otherInfo, landmarks: e.target.value })} 
            className="cyber-input" 
          />
          <button
            type="submit"
            disabled={isSearching}
            className="tactile-btn"
            style={{
              marginTop: 10,
              background: isSearching ? '#888' : '#FFD700',
              padding: 12,
              borderRadius: 8,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {isSearching ? (
              <>
                <span className="pulse-dot"></span> Mapping...
              </>
            ) : 'Submit Route'}
          </button>
          <button type="button" onClick={onClose} className="tactile-btn" style={{ background: '#333', color: '#fff', padding: 12, borderRadius: 8, border: 'none', cursor: 'pointer' }}>
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}

function LiveChatModal({ onClose, routeId = 'global', isAdmin = false, routeName = 'Global' }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  
  const [username] = useState(() => 'Commuter_' + Math.floor(Math.random() * 1000));
  const messagesEndRef = React.useRef(null);

  // 1. LISTEN TO ROUTE-SPECIFIC CHAT
  useEffect(() => {
    // Dynamic database path: chats/{routeId}/messages
    const chatRef = collection(db, 'chats', routeId, 'messages');
    const q = query(chatRef, orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(fetchedMessages);
      
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe(); 
  }, [routeId]);

  // 2. SEND MESSAGE
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const msgText = input;
    setInput(''); 
    
    try {
      await addDoc(collection(db, 'chats', routeId, 'messages'), {
        user: isAdmin ? 'Admin' : username,
        text: msgText,
        createdAt: serverTimestamp(), 
        timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    } catch (err) {
      console.error("Error sending: ", err);
    }
  };

  // 3. DELETE/UNSEND MESSAGE
  const handleDelete = async (msgId) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      try {
        await deleteDoc(doc(db, 'chats', routeId, 'messages', msgId));
      } catch (err) {
        console.error("Error deleting: ", err);
      }
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ background: '#111', padding: '16px 20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, color: '#FFF', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#22C55E', borderRadius: '50%', boxShadow: '0 0 10px #22C55E' }}></span>
            {routeName} Chat
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#888', fontSize: '12px' }}>
            Posting as: <strong style={{color: isAdmin ? '#EF4444' : '#FFF'}}>{isAdmin ? 'Admin' : username}</strong>
          </p>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer' }}>✖</button>
      </div>

      <div style={{ flexGrow: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.length === 0 && (
          <div style={{ color: '#888', textAlign: 'center', marginTop: '40px' }}>No messages yet. Ask about the line!</div>
        )}
        
        {messages.map((msg) => {
          const isMe = msg.user === username || (isAdmin && msg.user === 'Admin');
          return (
            <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px', textAlign: isMe ? 'right' : 'left', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                {isMe ? 'You' : msg.user} • {msg.timeStr}
                
                {/* DELETE BUTTON: Only shows if you sent it, OR if you are the Admin */}
                {(isMe || isAdmin) && (
                  <button onClick={() => handleDelete(msg.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '12px', padding: 0 }}>
                    🗑️
                  </button>
                )}
              </div>
              <div style={{ background: isMe ? '#FFD700' : '#222', color: isMe ? '#000' : '#FFF', padding: '12px 16px', borderRadius: '12px', borderBottomRightRadius: isMe ? '0px' : '12px', borderBottomLeftRadius: !isMe ? '0px' : '12px', fontWeight: isMe ? '600' : '400', border: msg.user === 'Admin' ? '2px solid #EF4444' : 'none' }}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} /> 
      </div>

      <div style={{ padding: '16px', background: '#111', borderTop: '1px solid #333' }}>
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '12px' }}>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this route..." 
            style={{ flexGrow: 1, background: '#222', border: '1px solid #444', color: '#fff', padding: '14px', borderRadius: '24px', outline: 'none' }}
          />
          <button type="submit" disabled={!input.trim()} style={{ background: input.trim() ? '#FFD700' : '#555', border: 'none', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() ? 'pointer' : 'default' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </form>
      </div>

    </div>
  );
}
function AppWalkthrough({ onEnd }) {
  const [step, setStep] = useState(1);

  const steps = [
    { title: "Find Your Route", text: "Use the search bar at the top to instantly find sharing autos and taxis for your specific destination.", top: '15%', align: 'center' },
    { title: "Switch Views", text: "Toggle between the Map view to see the routes visually, or the List view for fares and timings.", top: '50%', align: 'center' },
    { title: "Walking Directions", text: "Select any route and click the🚶icon to instantly see the dashed walking path from your exact location to the nearest pickup stand.", top: '65%', align: 'center' },
    
    // NEW STEP ADDED HERE:
    { title: "Live Route Chats", text: "Select a route and open Live Chat to talk with commuters on that exact sharing route line. Made a typo? You can hit the trash icon to unsend your messages!", top: '45%', align: 'center' },
    
    { title: "Find Nearest Stops", text: "Tap the 'Near Me' radar icon anytime to let GPS find the closest sharing stands to your current location.", top: '30%', align: 'flex-end' },
    { title: "Help the Community", text: "Open the menu to add secret routes you know about, or suggest edits to existing ones!", top: '40%', align: 'flex-start' }
  ];

  const current = steps[step - 1];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, pointerEvents: 'none' }}>
      {/* Dark semi-transparent background */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', pointerEvents: 'auto' }} onClick={() => setStep(step < steps.length ? step + 1 : onEnd)} />
      
      {/* Floating Tooltip Box */}
      <div style={{ position: 'absolute', top: current.top, left: 0, right: 0, display: 'flex', justifyContent: current.align, padding: '0 20px', pointerEvents: 'auto', transition: 'all 0.3s ease' }}>
        <div style={{ background: '#111', border: '2px solid #FFD700', borderRadius: '12px', padding: '20px', maxWidth: '300px', boxShadow: '0 10px 30px rgba(0,0,0,0.9)', animation: 'slideUpFade 0.3s ease' }}>
          
          {/* Dynamic Step Counter */}
          <div style={{ color: '#FFD700', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
            STEP {step} OF {steps.length}
          </div>
          
          <h3 style={{ margin: '0 0 8px 0', color: '#fff' }}>{current.title}</h3>
          <p style={{ margin: '0 0 16px 0', color: '#ccc', fontSize: '14px', lineHeight: '1.5' }}>{current.text}</p>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={onEnd} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '14px' }}>Skip Tour</button>
            <button onClick={() => step < steps.length ? setStep(step + 1) : onEnd()} style={{ background: '#FFD700', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              {step < steps.length ? 'Next ➔' : 'Get Started'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
function ContactModal({ onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 3500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="cyber-modal" style={{ background: '#111', border: '1px solid #333', borderRadius: '12px', padding: '24px', maxWidth: '350px', width: '100%', color: '#fff', boxShadow: '0px 10px 30px rgba(0,0,0,0.9)', animation: 'morphFade 0.25s ease-out' }}>
        <h2 style={{ color: '#FFD700', marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
          Contact Us
        </h2>
        <p style={{ color: '#ccc', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
          Got feedback, feature requests, or need help? Reach out directly.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <a href="mailto:kshitij.shinde1@vsit.edu.in" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#222', padding: '16px', borderRadius: '8px', color: '#fff', textDecoration: 'none', fontWeight: '600', transition: 'background 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.background = '#333'} onMouseOut={(e) => e.currentTarget.style.background = '#222'}>
            <span style={{ fontSize: '20px' }}>✉️</span> kshitij.shinde1@vsit.edu.in
          </a>
          
          <a href="tel:+919324328902" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#222', padding: '16px', borderRadius: '8px', color: '#fff', textDecoration: 'none', fontWeight: '600', transition: 'background 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.background = '#333'} onMouseOut={(e) => e.currentTarget.style.background = '#222'}>
            <span style={{ fontSize: '20px' }}>📞</span> +91 9324328902
          </a>
        </div>

        <button onClick={onClose} className="tactile-btn" style={{ marginTop: '24px', width: '100%', padding: '12px', background: 'transparent', color: '#888', fontWeight: 'bold', border: '1px solid #444', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#fff'} onMouseOut={(e) => e.currentTarget.style.color = '#888'}>
          Close
        </button>
      </div>
    </div>
  );
}
function LanguageModal({ currentLang, onSelect, onClose }) {
  const languages = [
    { code: 'EN', name: 'English', native: 'English' },
    { code: 'HI', name: 'Hindi', native: 'हिंदी' },
    { code: 'MR', name: 'Marathi', native: 'मराठी' }
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 3500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="cyber-modal" style={{ background: '#111', border: '1px solid #333', borderRadius: '12px', padding: '24px', maxWidth: '300px', width: '100%', color: '#fff', boxShadow: '0px 10px 30px rgba(0,0,0,0.9)', animation: 'morphFade 0.25s ease-out' }}>
        
        <h2 style={{ color: '#FFD700', marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
          Select Language
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {languages.map((lang) => (
            <button 
              key={lang.code}
              onClick={() => { onSelect(lang.code); onClose(); }}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: currentLang === lang.code ? 'rgba(255, 215, 0, 0.1)' : '#222', border: currentLang === lang.code ? '1px solid #FFD700' : '1px solid transparent', padding: '14px 16px', borderRadius: '8px', color: currentLang === lang.code ? '#FFD700' : '#fff', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <span>{lang.native}</span>
              <span style={{ fontSize: '12px', color: currentLang === lang.code ? '#FFD700' : '#888' }}>{lang.name}</span>
            </button>
          ))}
        </div>

        <button onClick={onClose} className="tactile-btn" style={{ marginTop: '20px', width: '100%', padding: '12px', background: 'transparent', color: '#888', fontWeight: 'bold', border: '1px solid #444', borderRadius: '8px', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function MapView({ routes, selectedId, onSelect, userLoc, walkingRoute }) {
  if (!routes || !Array.isArray(routes)) return <div style={{ color: '#fff', padding: 20 }}>Loading Map...</div>;

  const sel = routes.find((r) => r.id === selectedId);

 // 1. GATHER ALL STOPS 24/7 (Smart extraction from saved coords)
 const allMarkers = useMemo(() => {
  const m = [];
  
  routes.forEach((r) => {
    if (!r.stops || !Array.isArray(r.stops)) return;
    
    r.stops.forEach((stopName, idx) => {
      if (m.some((x) => x.name === stopName)) return;

      let pos = null;

      // A. Use the true coordinates we saved to Firebase!
      if (r.stopCoords && r.stopCoords[idx]) {
        pos = [r.stopCoords[idx].lat, r.stopCoords[idx].lng];
      }
      // B. Dictionary fallback for old routes
      else {
        const cleanName = stopName.toLowerCase().trim();
        const dictKey = Object.keys(COORDS || {}).find(k => k.toLowerCase() === cleanName);
        if (dictKey && COORDS[dictKey]) {
          pos = [COORDS[dictKey].lat, COORDS[dictKey].lng];
        } 
        // C. Curvy path ends fallback
        else if (r.path && r.path.length > 0) {
          if (idx === 0) {
            const pt = r.path[0];
            pos = Array.isArray(pt) ? pt : [pt.lat, pt.lng];
          } else if (idx === r.stops.length - 1) {
            const pt = r.path[r.path.length - 1];
            pos = Array.isArray(pt) ? pt : [pt.lat, pt.lng];
          }
        }
      }

      if (pos && pos[0] && pos[1]) {
        m.push({ name: stopName, pos });
      }
    });
  });
  
  return m;
}, [routes]);
  // Coordinates for the selected route line
  const selCoords = useMemo(() => {
    if (!sel) return null;
    if (sel.path && sel.path.length > 1) return sel.path;

    const getCoord = (stopName) => {
        if (!stopName) return null;
        const original = stopName.trim();
        if (COORDS[original]) return COORDS[original];
        
        let key = Object.keys(COORDS).find(k => k.toLowerCase() === original.toLowerCase());
        
        if (!key) {
            const clean = original.toLowerCase().replace(/\([a-z]\)/g, '').trim();
            key = Object.keys(COORDS).find(k => k.toLowerCase().replace(/\([a-z]\)/g, '').trim() === clean);
        }
        
        if (!key && original.toLowerCase().includes("thane")) {
            key = Object.keys(COORDS).find(k => k.toLowerCase() === "thane");
        }
        return key ? COORDS[key] : null;
    };

    // 🌟 LOOP FIX: Map through ALL stops so it connects every dot to the end!
    const mappedPoints = (sel.stops || []).map((stopName, index) => {
        // Stop 1: Lock onto your exact GPS coordinate
        if (index === 0 && sel.lat && sel.lng) return [sel.lat, sel.lng];
        
        // All other stops (including the final destination): Find in dictionary
        const c = getCoord(stopName);
        return c ? [c.lat, c.lng] : null;
    }).filter(Boolean); // Clean out any stops it couldn't find

    // Draw the full multi-stop line!
    if (mappedPoints.length > 1) return mappedPoints;
    
    if (sel.lat && sel.lng) return [[sel.lat, sel.lng]];
    return null;
}, [sel]);
  return (
    <div style={{ height: 400, width: '100%', borderRadius: 16, overflow: 'hidden', border: `2px solid ${BORDER}` }}>
      <MapContainer center={[19.20, 72.96]} zoom={11} style={{ height: '100%', width: '100%' }}>
        <TileLayer 
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" 
          attribution="&copy; OpenStreetMap"
          crossOrigin="anonymous" 
        />
        
        {/* 2. ONLY DRAW LINE IF ROUTE IS SELECTED */}
        {selCoords && selCoords.length >= 2 && (
          <>
            {/* Black Border Line */}
            <Polyline 
              positions={selCoords} 
              pathOptions={{ color: '#000', weight: 7, opacity: 0.8, lineCap: 'round', lineJoin: 'round' }} 
            />
            {/* Colored Foreground Line */}
            <Polyline 
              positions={selCoords} 
              pathOptions={{ color: META[sel.type]?.color || '#22C55E', weight: 4, opacity: 1, lineCap: 'round', lineJoin: 'round' }} 
            />
          </>
        )}

        {/* 3. WALKING ROUTE */}
        {walkingRoute && (
          <Polyline positions={walkingRoute} pathOptions={{ color: '#3b82f6', weight: 4, dashArray: '5, 10', opacity: 0.9 }} />
        )}

        {/* 4. DRAW ALL MARKERS 24/7 */}
    {allMarkers.map((m, i) => {
      const isSelected = (sel?.stops || []).includes(m.name);
      
      // HIDE the inaccurate dictionary marker if this route is active!
      if (isSelected) return null;

      return (
        <CircleMarker
          key={`all-${i}`}
          center={m.pos}
          radius={4.5}
          pathOptions={{
            color: '#000',
            weight: 2,
            fillColor: '#fff',
            fillOpacity: 1,
          }}
        >
          <Popup>{m.name}</Popup>
        </CircleMarker>
      );
    })}

    {/* 4.5 DRAW ALL PINS FOR THE SELECTED ROUTE */}
    {selCoords && selCoords.length > 1 && sel?.stops && (
      <>
        {sel.stops.map((stopName, index) => {
          let pos = null;

          // 1. Pull the exact true coordinates directly from the database!
          if (sel.stopCoords && sel.stopCoords[index]) {
            pos = [sel.stopCoords[index].lat, sel.stopCoords[index].lng];
          } 
          // 2. Fallback to dictionary for older routes
          else {
            const clean = stopName.toLowerCase().trim();
            const matchKey = Object.keys(COORDS || {}).find(k => k.toLowerCase() === clean);
            if (matchKey && COORDS[matchKey]) {
              pos = [COORDS[matchKey].lat, COORDS[matchKey].lng];
            }
          }

          // 3. Absolute last resort for older routes with no middle stop data
          if (!pos) {
              if (index === 0) pos = selCoords[0];
              else if (index === sel.stops.length - 1) pos = selCoords[selCoords.length - 1];
          }

          if (!pos) return null;

          return (
            <CircleMarker
              key={`sel-stop-${index}`}
              center={pos}
              radius={6}
              pathOptions={{ color: '#000', weight: 3, fillColor: '#fff', fillOpacity: 1 }}
            >
              <Popup>{stopName}</Popup>
            </CircleMarker>
          );
        })}
      </>
    )}
        {/* 5. USER LOCATION */}
        {userLoc && (
          <CircleMarker center={[userLoc.lat, userLoc.lng]} radius={7} pathOptions={{ color: '#fff', weight: 3, fillColor: '#3b82f6', fillOpacity: 1 }}>
            <Popup>You are here</Popup>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  );
}

function CustomerView({
  allRoutes,
  pendingCount,
  onAddRoute,
  onDeleteRoute,
  onAdminClick,
  adminMode,
  setAdminMode, 
  showToast, 
  setShowEditModal,
}) {
  const [adminAttempt, setAdminAttempt] = useState(0); 
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState('list');
  const [showForm, setShowForm] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [nearMe, setNearMe] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [walkingRoute, setWalkingRoute] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [language, setLanguage] = useState('EN');
  const [showLangModal, setShowLangModal] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const handleNearMeClick = () => {
    if (nearMe) {
      setNearMe(null);
      setLocationError('');
      return;
    }

    setIsLocating(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNearMe({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocating(false);
      },
      (err) => {
        console.error("Location error:", err);
        setLocationError("Could not get your location.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleNavigateToStop = async (stopName, lat, lng) => {
    if (!nearMe) {
      alert("Please click '📍 Near Me' first so we know your starting point!");
      return;
    }
    
    showToast(`Calculating walking route to ${stopName}...`, '#FFD700', '#000');
    
    try {
      const url = `https://router.project-osrm.org/route/v1/foot/${nearMe.lng},${nearMe.lat};${lng},${lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.routes && data.routes[0]) {
        const path = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
        setWalkingRoute(path);
        setTab('map'); 
      }
    } catch (err) {
      console.error("Routing error:", err);
      alert("Could not calculate route. Try again.");
    }
  };

  const filtered = useMemo(() => {
    // SECURITY GUARD: Prevents "Cannot read properties of undefined" crash
    if (!allRoutes || !Array.isArray(allRoutes)) return [];

    let results = allRoutes.filter((r) => {
      if (filter !== 'all' && r.type !== filter) return false;
      return (
        !search ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        (r.stops || []).some((s) => s.toLowerCase().includes(search.toLowerCase()))
      );
    });

    if (nearMe) {
      results = results.map(r => {
        
        // Helper function that just calculates distance between two points
        const calcDist = (lat, lng) => {
          const R = 6371; 
          const dLat = (lat - nearMe.lat) * (Math.PI / 180);
          const dLon = (lng - nearMe.lng) * (Math.PI / 180);
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + 
                    Math.cos(nearMe.lat * (Math.PI / 180)) * Math.cos(lat * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
          return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
        };

        let startLat = null;
        let startLng = null;

        // 1. The Magic: Grab the exact first coordinate from the curvy green line
        if (r.path && r.path.length > 0) {
          const pt = r.path[0];
          startLat = Array.isArray(pt) ? pt[0] : pt.lat;
          startLng = Array.isArray(pt) ? pt[1] : pt.lng;
        } 
        // 2. Fallback: If it's an old route without a line, look up the first stop name
        else if (r.stops && r.stops.length > 0) {
          const firstStop = r.stops[0].toLowerCase().trim();
          const matchKey = Object.keys(COORDS || {}).find(k => k.toLowerCase() === firstStop);
          if (matchKey && COORDS[matchKey]) {
            startLat = COORDS[matchKey].lat;
            startLng = COORDS[matchKey].lng;
          }
        }
        
        // 3. Absolute Last Resort: The old GPS ping
        if (!startLat && !startLng && r.lat && r.lng) {
          startLat = r.lat;
          startLng = r.lng;
        }

        // Calculate the true distance to the Start Point
        const finalDist = (startLat && startLng) ? calcDist(startLat, startLng) : Infinity;
        
        return { ...r, distance: finalDist };
      }).sort((a, b) => a.distance - b.distance); 
    }

    return results;
  }, [allRoutes, search, filter, nearMe]);

  return (
    <div>
      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes morphFade {
          0% { opacity: 0; transform: scale(0.97); }
          100% { opacity: 1; transform: scale(1); }
        }
        .route-card {
          transition: all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
        }
        .route-card:active {
          transform: scale(0.96) !important;
          box-shadow: 0px 2px 4px rgba(0,0,0,0.9) !important;
          border-color: rgba(255, 215, 0, 0.5) !important;
        }
        .shimeji {
          position: absolute;
          width: 24px;
          height: 14px;
          margin-top: -14px; 
          margin-left: -12px;
          z-index: 10;
          pointer-events: none;
          transform-origin: 50% 100%; 
          animation: perimeterDrive 12s linear infinite;
        }
        @keyframes perimeterDrive {
          0% { left: 0%; top: 0%; transform: rotate(0deg); }
          45% { left: 100%; top: 0%; transform: rotate(0deg); }
          46% { left: 100%; top: 0%; transform: rotate(90deg); } 
          49% { left: 100%; top: 100%; transform: rotate(90deg); }
          50% { left: 100%; top: 100%; transform: rotate(180deg); } 
          95% { left: 0%; top: 100%; transform: rotate(180deg); }
          96% { left: 0%; top: 100%; transform: rotate(270deg); } 
          99% { left: 0%; top: 0%; transform: rotate(270deg); }
          100% { left: 0%; top: 0%; transform: rotate(360deg); } 
        }
      `}</style>
      
      <div style={{ background: '#000000', borderBottom: '1px solid #2a2a2a' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
  onClick={() => setIsDrawerOpen(true)}
  className="pro-menu-btn"
  style={{ 
    background: 'transparent', 
    border: 'none', 
    color: '#E5E5E5', // Slightly off-white for a softer, premium look
    padding: '8px', 
    cursor: 'pointer', 
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    transition: 'all 0.2s ease'
  }}
>
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Staggered lines: Top is full, middle is short, bottom is medium */}
    <line x1="4" y1="7" x2="20" y2="7" style={{ transition: 'all 0.3s ease' }}></line>
    <line x1="4" y1="12" x2="14" y2="12" style={{ transition: 'all 0.3s ease' }}></line>
    <line x1="4" y1="17" x2="18" y2="17" style={{ transition: 'all 0.3s ease' }}></line>
  </svg>
</button>
            
            <div onClick={() => {
              if (adminMode) {
                onAdminClick();
                return;
              }
              const newCount = adminAttempt + 1;
              setAdminAttempt(newCount);
              if (newCount === 5) {
                const password = prompt("Enter Admin Password:");
                if (password === "KSHITIJ123") {
                  setAdminMode(true);
                  alert("Admin Mode Activated! Tap the logo one more time to open the Dashboard.");
                }
                setAdminAttempt(0);
              }
            }} style={{ cursor: 'pointer' }}>
              <h1 style={{ margin: 0, color: Y, fontSize: 24, fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src="/taxi.svg" alt="SharingFinder Logo" style={{ width: '32px', height: '32px', marginRight: '8px' }} />
      SharingFinder
    </h1>
            </div>
          </div>
        </div>
        
        <div style={{ padding: '0 16px 14px', maxWidth: 960, margin: '0 auto' }}>
          <div style={{ position: 'relative', width: '100%', borderRadius: '8px' }}>
            
            <div className="shimeji" style={{ animationDelay: '0s' }}>
              <svg width="24" height="14" viewBox="0 0 24 14">
                <path d="M2 10 L2 5 L6 2 L16 2 L20 5 L22 10 Z" fill="#FFD700" stroke="#000" strokeWidth="1"/>
                <path d="M6 2 L16 2 L18 5 L4 5 Z" fill="#111"/>
                <circle cx="5" cy="12" r="2" fill="#333"/><circle cx="17" cy="12" r="2" fill="#333"/>
                <circle cx="14" cy="4" r="1.5" fill="#fff"/>
              </svg>
            </div>

            <div className="shimeji" style={{ animationDelay: '-6s' }}>
              <svg width="22" height="14" viewBox="0 0 22 14">
                <path d="M3 10 L3 2 L14 2 L18 6 L19 10 Z" fill="#111" stroke="#FFD700" strokeWidth="1"/>
                <path d="M5 2 L12 2 L12 6 L4 6 Z" fill="none" stroke="#FFD700"/>
                <circle cx="6" cy="12" r="1.5" fill="#333"/><circle cx="16" cy="12" r="1.5" fill="#333"/>
                <circle cx="9" cy="4.5" r="1.5" fill="#fff"/>
              </svg>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={translations[language].search}
              style={{ ...inp, position: 'relative', zIndex: 5 }} 
            />
          </div>
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
              {v === 'all' ? translations[language].all : v === 'share_taxi' ? translations[language].taxi : translations[language].auto}
            </button>
          ))}
          
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button
              onClick={handleNearMeClick}
              disabled={isLocating}
              className={`tactile-btn ${!isLocating ? 'near-me-glow' : ''}`}
              style={{
                background: isLocating ? '#0f172a' : (nearMe ? '#0f172a' : CARD),
                color: nearMe ? '#60a5fa' : MUTED,
                padding: '6px 12px',
                borderRadius: 12,
                border: isLocating ? '1px solid rgba(0, 255, 65, 0.6)' : 'none', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '100px',
                minHeight: '36px',
                transition: 'all 0.3s ease'
              }}
            >
              <style>{`
                @keyframes svg-radar-spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
              `}</style>
            
              {isLocating ? (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  style={{ animation: 'svg-radar-spin 1.2s linear infinite' }}
                >
                  <circle cx="12" cy="12" r="10" stroke="rgba(0, 255, 65, 0.3)" strokeWidth="2" fill="none" />
                  <path d="M12 12 L12 2 A10 10 0 0 1 22 12 Z" fill="rgba(0, 255, 65, 0.9)" />
                  <circle cx="12" cy="12" r="2" fill="#111" />
                </svg>
              ) : (
                <span>📍 {translations[language].nearMe}</span>
              )}
            </button>
            {locationError && <div style={{ color: 'red', fontSize: '11px', marginTop: '2px', position: 'absolute', transform: 'translateY(32px)' }}>{locationError}</div>}
          </div>
        </div>

        <div 
          key={tab} 
          style={{
            animation: 'morphFade 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            opacity: 0
          }}
        ></div>

        {tab === 'list' ? (
          filtered.map((r, index) => (
          <div 
            key={r.id} 
            style={{
              opacity: 0,
              animation: 'slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              animationDelay: `${index * 60}ms`
            }}
          >
            <RouteCard
              route={r}
              selected={selectedId === r.id}
              onSelect={() => setSelectedId((p) => (p === r.id ? null : r.id))}
              onDelete={onDeleteRoute}
              adminMode={adminMode}
              distance={r.distance}
              onNavigate={handleNavigateToStop} 
              onSuggestEdit={() => setShowEditModal(true)} // Fixed Missing Handler!
              language={language}
              translations={translations}
            />
          </div>
        ))
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {/* MapView might need importing at the top if it fails! */}
            <MapView
              routes={filtered}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId((p) => (p === id ? null : id))}
              userLoc={nearMe}
              walkingRoute={walkingRoute} 
            />
            <div style={{ marginTop: 8 }}>
              {filtered.map((r) => (
                <RouteCard
                  key={r.id}
                  route={r}
                  selected={selectedId === r.id}
                  onSelect={() =>
                    setSelectedId((p) => (p === r.id ? null : r.id))
                  }
                  onDelete={onDeleteRoute}
                  adminMode={adminMode}
                  distance={r.distance}
                  onNavigate={handleNavigateToStop}
                  onSuggestEdit={() => setShowEditModal(true)} // Fixed Missing Handler!
                  language={language}
              translations={translations}
                />
              ))}
            </div>
          </div>
        )}
      </div> 

      <div style={{
        position: 'fixed',
        bottom: '16px', 
        left: 0,
        width: '100%',
        display: 'flex',
        justifyContent: 'center', 
        gap: '12px',
        zIndex: 900,
        pointerEvents: 'none' 
      }}>
        <button 
          onClick={() => setTab('list')}
          style={{
            pointerEvents: 'auto', 
            padding: '10px 24px', 
            borderRadius: '30px', 
            background: tab === 'list' ? 'linear-gradient(135deg, #FFD700 0%, #F59E0B 100%)' : '#1a1a1a',
            color: tab === 'list' ? '#000' : '#888',
            fontWeight: 900,
            fontSize: '13px', 
            border: tab === 'list' ? '1px solid rgba(255,255,255,0.6)' : '1px solid #333',
            textShadow: tab === 'list' ? '0px 1px 1px rgba(255, 255, 255, 0.8)' : 'none', 
            boxShadow: tab === 'list' ? 'inset 0px 2px 4px rgba(255,255,255,0.5), 0px 6px 16px rgba(255, 215, 0, 0.3)' : '0px 6px 16px rgba(0,0,0,0.8)', 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
          {translations[language].list}
        </button>
        
        <button 
          onClick={() => setTab('map')}
          style={{
            pointerEvents: 'auto',
            padding: '10px 24px',
            borderRadius: '30px',
            background: tab === 'map' ? 'linear-gradient(135deg, #FFD700 0%, #F59E0B 100%)' : '#1a1a1a',
            color: tab === 'map' ? '#000' : '#888',
            fontWeight: 900,
            fontSize: '13px',
            border: tab === 'map' ? '1px solid rgba(255,255,255,0.6)' : '1px solid #333',
            textShadow: tab === 'map' ? '0px 1px 1px rgba(255, 255, 255, 0.8)' : 'none',
            boxShadow: tab === 'map' ? 'inset 0px 2px 4px rgba(255,255,255,0.5), 0px 6px 16px rgba(255, 215, 0, 0.3)' : '0px 6px 16px rgba(0,0,0,0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line>
          </svg>
          {translations[language].map}
        </button>
      </div>
      
      <div style={{ height: '100px', width: '100%' }}></div>

      {isDrawerOpen && (
  <>
    <style>{`
      @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    `}</style>

    {/* Dark Overlay */}
    <div 
      onClick={() => setIsDrawerOpen(false)}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)', zIndex: 999, animation: 'fadeIn 0.2s ease-out forwards' }}
    />
    
    {/* Drawer Container */}
    <div 
      style={{ position: 'fixed', top: 0, left: 0, height: '100%', width: '280px', background: '#0a0a0a', borderRight: '1px solid #222', boxShadow: '4px 0 24px rgba(0,0,0,0.8)', zIndex: 1000, animation: 'slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards', display: 'flex', flexDirection: 'column', padding: '24px 20px', boxSizing: 'border-box' }}
    >
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: '#FFF', fontSize: 20 }}>Menu</h2>
        <button onClick={() => setIsDrawerOpen(false)} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: 24, cursor: 'pointer' }}>✖</button>
      </div>

      {/* NEW Navigation Links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexGrow: 1 }}>
      <button className="menu-item" onClick={() => { setIsDrawerOpen(false); setShowChat(true); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
          {translations[language].liveChat}
        </button>
        
        <button className="menu-item" onClick={() => { setIsDrawerOpen(false); setShowFaq(true); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          {translations[language].featuresGuide}
        </button>

        <button className="menu-item" onClick={() => { setIsDrawerOpen(false); setShowLangModal(true); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
          {translations[language].language} ({language})
        </button>

        <button className="menu-item" onClick={() => { setIsDrawerOpen(false); setShowContact(true); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
          {translations[language].contactUs}
        </button>
      </div>

      {/* Existing Secret Route Box (Pushed to bottom) */}
      <div style={{ background: '#161616', border: '1px dashed #FFD700', borderRadius: 12, padding: '20px', textAlign: 'center', marginTop: '24px' }}>
        <div style={{ fontSize: 24, marginBottom: '8px' }}>🤫</div>
        <p style={{ color: '#ccc', fontSize: 13, lineHeight: 1.5, margin: '0 0 16px 0', fontWeight: 500 }}>
        {translations[language].secretTitle}
        </p>
        <button className="tactile-btn" onClick={() => { setIsDrawerOpen(false); setShowForm(true); }} style={{ width: '100%', padding: '10px', borderRadius: 6, fontWeight: 800, fontSize: 14, background: 'linear-gradient(135deg, #FFD700 0%, #F59E0B 100%)', color: '#111', border: 'none', cursor: 'pointer', marginBottom: '8px' }}>
        {translations[language].addRoute}
        </button>
        <button className="tactile-btn" onClick={() => { setIsDrawerOpen(false); setShowEditModal(true); }} style={{ width: '100%', padding: '10px', borderRadius: 6, fontWeight: 800, fontSize: 14, background: '#222', color: '#FFD700', border: '1px solid #FFD700', cursor: 'pointer' }}>
        {translations[language].suggestEdit} ✏️
        </button>
      </div>

    </div>
  </>
)}
      
      {/* Needs AddRouteForm to be imported if it is moved! */}
      {showForm && (
        <AddRouteForm
          onSubmit={onAddRoute}
          onClose={() => setShowForm(false)}
        />
      )}
      {/* Drop the FAQ Modal right here! */}
      <FaqModal 
        isOpen={showFaq} 
        onClose={() => setShowFaq(false)} 
        onOpenTour={() => {
          setShowFaq(false); // Close the FAQ
          setShowTour(true); // Open the old Tour!
        }}
      />
      {showChat && (
        <LiveChatModal 
          onClose={() => setShowChat(false)} 
          routeId={selectedId || 'global'} 
          routeName={selectedId ? allRoutes.find(r => r.id === selectedId)?.name : 'Mumbai Commuter'}
          isAdmin={adminMode} // Passes your KSHITIJ123 admin status down to the chat
        />
      )}
      {showTour && <AppWalkthrough onEnd={() => setShowTour(false)} />}
      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
      {showLangModal && (
        <LanguageModal 
          currentLang={language} 
          onSelect={(code) => setLanguage(code)} 
          onClose={() => setShowLangModal(false)} 
        />
      )}
    </div>
  );
}


const Stripe = () => (
  <div style={{ height: 12, display: 'flex', width: '100%', overflow: 'hidden' }}>
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

export default CustomerView;
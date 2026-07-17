
import autoIcon from './assets/auto.svg';
export const COORDS = {
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
  
 export const BASE_ROUTES = [
    {
      id: 1,
      type: 'share_taxi',
      name: 'Bandra (W) → Kurla',
      stops: ['Bandra (W)', 'Bandra (E)', 'Kurla'],
      fare: '₹15-20',
      freq: 'Every 5-10 min',
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
    
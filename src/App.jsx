import React, { useState, useEffect } from 'react';
import { 
  MapPin, User, CheckCircle, RotateCw, ShieldCheck, 
  Monitor, Smartphone, LogOut, Users, Play, StopCircle, 
  Wifi, Database
} from 'lucide-react';

// --- THƯ VIỆN FIREBASE ---
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, updateDoc, 
  doc, onSnapshot, query, orderBy, where, serverTimestamp 
} from "firebase/firestore";

// ==========================================
// 1. CẤU HÌNH (THẦY TÚ ĐIỀN THÔNG TIN VÀO ĐÂY)
// ==========================================

// A. Firebase Config (Lấy từ Project Settings trên Firebase Console)
// THẦY NHỚ THAY ĐOẠN NÀY BẰNG CONFIG THẬT CỦA THẦY
const firebaseConfig = {
  apiKey: "AIzaSyAqmbl_6dZoQ4_mkXw16D6s6KUfX4Wcvj4",
  authDomain: "smart-checkin-ntd.firebaseapp.com",
  projectId: "smart-checkin-ntd",
  storageBucket: "smart-checkin-ntd.firebasestorage.app",
  messagingSenderId: "481428048162",
  appId: "1:481428048162:web:6d163ca93f22b8cb347d7b"
};

// B. Cấu hình Trường học (Mặc định: THCS Nguyễn Thị Định)
const SCHOOL_COORDS = { lat: 10.762622, lng: 106.660172 };
const ALLOWED_RADIUS = 300; // Bán kính cho phép (mét)

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Hàm tính khoảng cách GPS
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; 
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const deltaP = p2 - p1;
  const deltaLon = (lon2 - lon1) * Math.PI/180;
  const a = Math.sin(deltaP/2) * Math.sin(deltaP/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

// ==========================================
// MAIN APP
// ==========================================
export default function App() {
  const [view, setView] = useState('select'); // select, host, user
  
  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 h-[850px] relative flex flex-col">
        {/* Header */}
        <div className="bg-[#0068FF] p-4 text-white flex justify-between items-center shadow-md z-50">
          <div className="flex items-center gap-2 font-bold">
            {view === 'host' ? <Monitor size={20} /> : <Smartphone size={20} />}
            <span className="truncate max-w-[220px]">
              {view === 'host' ? 'Admin Realtime' : view === 'user' ? 'Check-in App' : 'Điểm danh thông minh'}
            </span>
          </div>
          {view !== 'select' && (
            <button onClick={() => setView('select')} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition">
              <LogOut size={16} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative bg-slate-50">
          {view === 'select' && <RoleSelector setView={setView} />}
          {view === 'host' && <HostRealtime />}
          {view === 'user' && <UserRealtime />}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 1. MÀN HÌNH CHỌN (HOME)
// ==========================================
const RoleSelector = ({ setView }) => (
  <div className="h-full flex flex-col items-center justify-center p-8 bg-white text-center">
     <div className="w-32 h-32 mb-6 flex items-center justify-center">
        {/* LOGO TRƯỜNG */}
        <img 
          src="https://i.postimg.cc/W1yDdWZT/NTD.png" 
          alt="Logo THCS Nguyễn Thị Định" 
          className="w-full h-full object-contain"
        />
     </div>
     <h1 className="text-xl font-bold mb-2 text-gray-800 uppercase leading-tight">
       ĐIỂM DANH THÔNG MINH
     </h1>
     <h2 className="text-sm font-semibold text-blue-600 mb-8 uppercase tracking-wider">
       TRƯỜNG THCS NGUYỄN THỊ ĐỊNH
     </h2>

     <div className="w-full space-y-3">
       <button 
        onClick={() => setView('host')} 
        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 flex justify-center items-center gap-2 transition-transform active:scale-95"
       >
         <Monitor size={20}/> Quản Trị Viên (Host)
       </button>
       <button 
        onClick={() => setView('user')} 
        className="w-full bg-slate-100 text-slate-700 border border-slate-200 py-4 rounded-xl font-bold hover:bg-slate-200 flex justify-center items-center gap-2 transition-transform active:scale-95"
       >
         <Smartphone size={20}/> Giáo Viên (Mobile)
       </button>
     </div>
     <p className="mt-8 text-xs text-gray-400">Phiên bản 2.0 - Phát triển bởi Thầy Tú</p>
  </div>
);

// ==========================================
// 2. ADMIN (HOST) - MÁY CHIẾU
// ==========================================
function HostRealtime() {
  const [activeSession, setActiveSession] = useState(null);
  const [attendees, setAttendees] = useState([]);

  // Lắng nghe phiên họp Active
  useEffect(() => {
    const q = query(collection(db, "sessions"), where("status", "==", "active"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setActiveSession({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setActiveSession(null);
        setAttendees([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Lắng nghe danh sách điểm danh
  useEffect(() => {
    if (!activeSession) return;
    const q = query(
      collection(db, "attendance"), 
      where("sessionId", "==", activeSession.id),
      orderBy("timestamp", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAttendees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [activeSession]);

  const createSession = async () => {
    const title = prompt("Nhập tên cuộc họp:", "Họp Hội Đồng Tháng 1");
    if (!title) return;
    // Tắt các phiên cũ nếu cần (Optional)
    await addDoc(collection(db, "sessions"), {
      title, status: 'active', code: Math.floor(1000 + Math.random() * 9000).toString(), createdAt: serverTimestamp()
    });
  };

  const closeSession = async (id) => {
    if(confirm("Thầy có chắc chắn muốn kết thúc phiên họp này?")) {
      await updateDoc(doc(db, "sessions", id), { status: 'closed' });
    }
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-4 overflow-y-auto">
      {activeSession ? (
        <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden animate-fade-in-up">
           <div className="absolute right-0 top-0 opacity-10"><Wifi size={100}/></div>
           <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-blue-100 text-xs font-bold uppercase">Đang diễn ra</h3>
                <h2 className="text-xl font-bold">{activeSession.title}</h2>
              </div>
              <div className="bg-white/20 px-2 py-1 rounded text-xs animate-pulse flex items-center gap-1"><Database size={10}/> LIVE</div>
           </div>
           
           <div className="bg-white/20 rounded-xl p-4 flex justify-between items-center backdrop-blur-sm mb-4">
              <div>
                <p className="text-xs text-blue-100">Mã Xác Thực</p>
                <p className="text-5xl font-mono font-bold tracking-widest">{activeSession.code}</p>
              </div>
              <button onClick={() => closeSession(activeSession.id)} className="bg-white text-red-600 px-3 py-2 rounded-lg font-bold text-xs shadow hover:bg-red-50">
                <StopCircle size={16} className="inline mr-1"/>Kết thúc
              </button>
           </div>
           
           <div className="flex items-center gap-2 text-sm"><Users size={16}/> <span>Đã điểm danh: <b>{attendees.length}</b></span></div>
        </div>
      ) : (
        <button onClick={createSession} className="w-full py-12 border-2 border-dashed border-blue-300 rounded-2xl bg-blue-50 text-blue-600 font-bold hover:bg-blue-100 transition flex flex-col items-center gap-2">
           <Play size={40}/> <span>Bắt đầu phiên họp mới</span>
        </button>
      )}

      {/* Danh sách */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1">
         <div className="p-3 bg-gray-50 border-b font-bold text-sm text-gray-700 flex justify-between">
            <span>Danh sách tham dự</span>
            <span className="text-blue-600">{attendees.length}</span>
         </div>
         <div className="overflow-y-auto max-h-[400px]">
            {attendees.length === 0 ? (
               <div className="p-8 text-center text-gray-400 text-sm italic">Chưa có dữ liệu...</div>
            ) : (
               attendees.map(user => (
                  <div key={user.id} className="p-3 border-b flex justify-between items-center hover:bg-gray-50 animate-fade-in-left">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                           {user.userName?.charAt(0)}
                        </div>
                        <div>
                           <p className="text-sm font-bold text-gray-800">{user.userName}</p>
                           <p className="text-xs text-gray-500">
                             {user.timestamp ? new Date(user.timestamp.seconds * 1000).toLocaleTimeString() : '...'}
                           </p>
                        </div>
                     </div>
                     <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded border border-green-100">Có mặt</span>
                  </div>
               ))
            )}
         </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. USER (TEACHER) - ĐIỆN THOẠI
// ==========================================
function UserRealtime() {
  const [activeSession, setActiveSession] = useState(null);
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState('idle'); 
  const [gps, setGps] = useState({ loading: false, valid: false, distance: 0 });
  const [isTestMode, setIsTestMode] = useState(false); // Mode test cho Thầy Tú

  // Lắng nghe phiên active
  useEffect(() => {
    const q = query(collection(db, "sessions"), where("status", "==", "active"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) setActiveSession({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      else setActiveSession(null);
    });
    return () => unsubscribe();
  }, []);

  // Hàm Check GPS
  const checkGPS = () => {
    setGps(prev => ({ ...prev, loading: true }));
    
    // Nếu Test Mode -> Luôn đúng
    if (isTestMode) {
      setTimeout(() => setGps({ loading: false, valid: true, distance: 0 }), 800);
      return;
    }

    if (!navigator.geolocation) { alert("Máy không hỗ trợ GPS"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
         const dist = getDistance(pos.coords.latitude, pos.coords.longitude, SCHOOL_COORDS.lat, SCHOOL_COORDS.lng);
         const isValid = dist <= ALLOWED_RADIUS; 
         setGps({ loading: false, valid: isValid, distance: Math.round(dist) });
      },
      (err) => { setGps(prev => ({ ...prev, loading: false })); }
    );
  };

  useEffect(() => { checkGPS(); }, [isTestMode]);

  const handleSubmit = async () => {
    if (!activeSession) { alert("Không có phiên họp!"); return; }
    if (pin !== activeSession.code) { alert("Sai mã xác thực!"); return; }
    
    setStatus('checking');
    try {
      // User Name giả lập (Sau này lấy từ Zalo)
      const mockName = prompt("Nhập tên Thầy/Cô để điểm danh:", "GV. Nguyễn Thanh Tú");
      if(!mockName) { setStatus('idle'); return; }

      await addDoc(collection(db, "attendance"), {
        sessionId: activeSession.id,
        userId: "user_" + Date.now(),
        userName: mockName,
        timestamp: serverTimestamp(),
        gpsValid: gps.valid
      });
      setStatus('success');
    } catch (e) {
      alert("Lỗi: " + e.message); setStatus('idle');
    }
  };

  if (status === 'success') {
     return (
        <div className="h-full flex flex-col items-center justify-center p-6 bg-white animate-fade-in-up text-center">
           <CheckCircle size={64} className="text-green-500 mb-4"/>
           <h2 className="text-2xl font-bold text-gray-800">Thành công!</h2>
           <p className="text-gray-500 mb-6">Đã ghi nhận điểm danh.</p>
           <button onClick={() => { setStatus('idle'); setPin(''); }} className="text-blue-600 font-bold hover:underline">Về màn hình chính</button>
        </div>
     );
  }

  return (
    <div className="flex flex-col h-full p-4 space-y-6">
       {/* GPS Status */}
       <div className={`p-4 rounded-xl border transition-all ${gps.valid ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
          <div className="flex justify-between items-center mb-2">
             <div className="flex items-center gap-2">
                <MapPin size={18} className={gps.valid ? "text-blue-600" : "text-gray-400"} />
                <span className="font-bold text-sm">Vị trí hiện tại</span>
             </div>
             <button onClick={() => setIsTestMode(!isTestMode)} className="text-[10px] bg-gray-200 px-2 py-1 rounded hover:bg-gray-300">{isTestMode ? "Tắt Test" : "Bật Test"}</button>
          </div>
          <p className="text-xs text-gray-500">
             {gps.loading ? "Đang định vị..." : gps.valid ? "Hợp lệ: Đã vào trường" : "Chưa xác định / Ở xa"}
          </p>
       </div>

       {/* Checkin Form */}
       <div className="text-center">
          {activeSession ? (
             <>
                <p className="text-sm font-bold text-blue-800 mb-4">{activeSession.title}</p>
                <div className="flex justify-center gap-2 mb-4">
                  {[0,1,2,3].map(i => (
                    <div key={i} className={`w-12 h-14 rounded border flex items-center justify-center text-2xl font-bold ${pin[i] ? 'border-blue-500 text-blue-600 bg-white' : 'bg-gray-50'}`}>
                      {pin[i] || ''}
                    </div>
                  ))}
                </div>

                {/* Numpad */}
                <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto mb-6">
                   {[1,2,3,4,5,6,7,8,9,0].map(n => (
                      <button key={n} onClick={() => setPin(p => p.length < 4 ? p + n : p)} className="py-3 bg-white border rounded-lg shadow-sm text-lg font-bold active:bg-gray-100">{n}</button>
                   ))}
                   <button onClick={() => setPin(p => p.slice(0, -1))} className="col-span-2 py-3 bg-red-50 text-red-500 rounded-lg text-sm font-bold">XÓA</button>
                </div>

                <button 
                  onClick={handleSubmit} 
                  disabled={!gps.valid || pin.length !== 4 || status === 'checking'}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'checking' ? <RotateCw className="animate-spin mx-auto"/> : "XÁC NHẬN CÓ MẶT"}
                </button>
             </>
          ) : (
             <div className="py-10 text-gray-400 italic flex flex-col items-center">
                <ShieldCheck size={48} className="opacity-20 mb-2"/>
                Chưa có phiên họp nào được mở
             </div>
          )}
       </div>
    </div>
  );
}
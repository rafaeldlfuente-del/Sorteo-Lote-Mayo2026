/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Settings, 
  User, 
  CreditCard, 
  CheckCircle, 
  Trash2, 
  Download, 
  X,
  Plus,
  BarChartIcon,
  Smartphone,
  Pencil,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- TYPES ---
interface Reservation {
  number: string;
  name: string;
  timestamp: number;
}

// --- CONSTANTS ---
const PRICE_PER_NUMBER = 2;
const BIZUM_NUMBER = "XXXXXXXXXX"; // Placeholder - can be edited by admin
const ADMIN_PIN = "191104";
const APP_VERSION = "1.4.0";

export default function App() {
  // --- STATE ---
  const [reservations, setReservations] = useState<Record<string, Reservation>>(() => {
    const saved = localStorage.getItem('sorteo_reservations');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [bizumPhone, setBizumPhone] = useState(() => {
    const saved = localStorage.getItem('sorteo_bizum');
    return saved || BIZUM_NUMBER;
  });

  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [participantName, setParticipantName] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [editedName, setEditedName] = useState("");
  const [showInfoModal, setShowInfoModal] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [confirmModal, setConfirmModal] = useState<{
    type: 'reset' | 'delete';
    number?: string;
  } | null>(null);

  // --- PERSISTENCE ---
  useEffect(() => {
    localStorage.setItem('sorteo_reservations', JSON.stringify(reservations));
  }, [reservations]);

  useEffect(() => {
    localStorage.setItem('sorteo_bizum', bizumPhone);
  }, [bizumPhone]);

  // --- DERIVED STATE ---
  const reservedCount = useMemo(() => Object.keys(reservations).length, [reservations]);
  const availableCount = 100 - reservedCount;
  const totalRevenue = reservedCount * PRICE_PER_NUMBER;

  // --- ACTIONS ---
  const handleReserve = () => {
    if (selectedNumbers.length === 0 || !participantName.trim()) {
      setErrorMessage("Por favor, introduce tu nombre.");
      return;
    }

    const newReservations = { ...reservations };
    const now = Date.now();
    
    selectedNumbers.forEach(num => {
      newReservations[num] = {
        number: num,
        name: participantName.trim(),
        timestamp: now
      };
    });

    setReservations(newReservations);
    setSelectedNumbers([]);
    setShowReservationModal(false);
    setParticipantName("");
    setErrorMessage("");
  };

  const toggleNumberSelection = (num: string) => {
    setSelectedNumbers(prev => 
      prev.includes(num) 
        ? prev.filter(n => n !== num) 
        : [...prev, num]
    );
  };

  const handleUpdateReservation = () => {
    if (!editingReservation || !editedName.trim()) return;

    setReservations(prev => ({
      ...prev,
      [editingReservation.number]: {
        ...prev[editingReservation.number],
        name: editedName.trim()
      }
    }));

    setEditingReservation(null);
    setEditedName("");
  };

  const handleDeleteReservation = (num: string) => {
    const newReservations = { ...reservations };
    delete newReservations[num];
    setReservations(newReservations);
    setConfirmModal(null);
  };

  const handleResetRaffle = () => {
    setReservations({});
    setIsAdminAuthenticated(false);
    setShowAdmin(false);
    setConfirmModal(null);
  };

  const handleAdminAuth = () => {
    if (adminPinInput === ADMIN_PIN) {
      setIsAdminAuthenticated(true);
      setAdminPinInput("");
    } else {
      setErrorMessage("PIN incorrecto");
    }
  };

  const exportToCSV = () => {
    const sorted = (Object.values(reservations) as Reservation[]).sort((a, b) => parseInt(a.number) - parseInt(b.number));
    const header = "Número,Participante,Fecha\n";
    const rows = sorted.map(r => `${r.number},"${r.name}",${new Date(r.timestamp).toLocaleString()}`).join("\n");
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sorteo_escolar_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split("\n");
      const newReservations: Record<string, Reservation> = { ...reservations };
      let importCount = 0;
      let errorCount = 0;

      // Skip header if present
      const startIndex = lines[0].toLowerCase().includes("número") || lines[0].toLowerCase().includes("numero") ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple CSV parser (handling quoted participants)
        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (parts.length >= 2) {
          const numStr = parts[0].trim().padStart(2, '0');
          const name = parts[1].trim().replace(/^"|"$/g, '');
          const timestampStr = parts[2]?.trim();
          const timestamp = timestampStr ? new Date(timestampStr).getTime() : Date.now();

          // Validate number is 00-99
          const num = parseInt(numStr);
          if (!isNaN(num) && num >= 0 && num <= 99) {
            newReservations[numStr] = {
              number: numStr,
              name: name,
              timestamp: isNaN(timestamp) ? Date.now() : timestamp
            };
            importCount++;
          } else {
            errorCount++;
          }
        }
      }

      setReservations(newReservations);
      alert(`Importación completada:\n- ${importCount} registros importados/actualizados\n- ${errorCount} errores`);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  // --- RENDER HELPERS ---
  const renderNumberGrid = () => {
    return Array.from({ length: 100 }, (_, i) => {
      const numStr = i.toString().padStart(2, '0');
      const reservation = reservations[numStr];
      const isReserved = !!reservation;

      const isSelected = selectedNumbers.includes(numStr);

      return (
        <motion.button
          key={numStr}
          id={`num-${numStr}`}
          whileHover={!isReserved ? { scale: 1.05 } : {}}
          whileTap={!isReserved ? { scale: 0.95 } : {}}
          onClick={() => !isReserved && toggleNumberSelection(numStr)}
          className={`
            relative flex flex-col items-center justify-center rounded-lg transition-all duration-200 aspect-square border-2
            ${isReserved 
              ? 'bg-reserved-bg border-slate-300 text-slate-400 cursor-not-allowed' 
              : isSelected
                ? 'bg-school-blue border-school-blue text-white shadow-lg z-10'
                : 'bg-white border-slate-200 text-school-blue cursor-pointer hover:border-school-blue hover:bg-school-blue/5'}
          `}
        >
          <span className={`text-lg md:text-xl font-extrabold ${isReserved ? 'opacity-40' : ''} ${isSelected ? 'text-white' : ''}`}>
            {numStr}
          </span>
          {isReserved && (
            <span className="text-[8px] md:text-[9px] font-bold uppercase mt-0.5 truncate max-w-[90%] text-school-orange">
              {reservation.name.split(' ')[0]}
            </span>
          )}
          {isSelected && (
            <div className="absolute top-1 right-1">
              <CheckCircle className="w-3 h-3 text-white fill-white/20" />
            </div>
          )}
        </motion.button>
      );
    });
  };

  return (
    <div className="min-h-screen bg-school-bg font-sans text-slate-800 flex flex-col">
      {/* Header */}
      <header className="bg-school-blue text-white px-6 md:px-10 py-5 flex flex-col md:flex-row justify-between items-center border-b-6 border-school-yellow z-20 relative">
        <div className="absolute top-2 left-4 text-[9px] font-bold opacity-30 tracking-tighter uppercase pointer-events-none">
          Build {APP_VERSION}
        </div>
        <div className="text-center md:text-left mb-4 md:mb-0">
          <h1 className="text-2xl md:text-3xl font-extrabold uppercase tracking-wider">SORTEO ESCOLAR 2026</h1>
          <p className="text-sm opacity-90 mt-1">Sorteo cheque material escolar 50€</p>
        </div>
        
        <div className="flex gap-6 md:gap-10">
          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold text-school-yellow leading-tight">{availableCount}</div>
            <div className="text-[10px] uppercase tracking-widest opacity-80">Disponibles</div>
          </div>
          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold text-school-yellow leading-tight">{reservedCount}</div>
            <div className="text-[10px] uppercase tracking-widest opacity-80">Reservados</div>
          </div>
          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold text-school-yellow leading-tight">{totalRevenue}€</div>
            <div className="text-[10px] uppercase tracking-widest opacity-80">Recaudado</div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:grid md:grid-cols-[320px_1fr] overflow-hidden">
        {/* Sidebar */}
        <aside className="bg-white p-6 md:p-10 border-r border-slate-200 flex flex-col gap-6 overflow-y-auto">
          <div className="bg-school-orange text-white py-3 px-4 rounded-lg text-center font-bold text-lg shadow-sm">
            {PRICE_PER_NUMBER}€ POR NÚMERO
          </div>

          <button 
            onClick={() => setShowInfoModal(true)}
            className="w-full bg-school-yellow text-school-blue py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-white transition-all flex items-center justify-center gap-2"
          >
            <Trophy className="w-4 h-4" />
            Sobre el sorteo...
          </button>

          <div className="bg-linear-to-br from-[#00ced1] to-[#008b8b] text-white p-6 rounded-2xl shadow-lg">
            <div className="text-[10px] uppercase font-bold mb-2 opacity-90 tracking-wider">Pago por Bizum</div>
            <div className="text-2xl font-black tracking-wider leading-none mb-3">{bizumPhone}</div>
            <div className="text-[10px] bg-black/10 p-2 rounded inline-block">
              Concepto: <span className="font-bold">SORTEO-[NÚMERO]</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-school-blue" />
              ¿Cómo participar?
            </div>
            <ol className="text-xs text-slate-500 space-y-3 leading-relaxed">
              <li className="flex gap-2">
                <span className="font-bold text-school-blue">1.</span>
                Elige un número disponible en la cuadrícula.
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-school-blue">2.</span>
                Introduce tu nombre completo.
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-school-blue">3.</span>
                Realiza el Bizum con el concepto indicado.
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-school-blue">4.</span>
                ¡Tu número quedará reservado al instante!
              </li>
            </ol>
          </div>

          <div className="flex gap-4 pt-2">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
              <div className="w-3 h-3 bg-white border border-slate-200 rounded-sm"></div>
              LIBRE
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
              <div className="w-3 h-3 bg-reserved-bg border border-slate-300 rounded-sm"></div>
              RESERVADO
            </div>
          </div>

          <button 
            id="admin-trigger"
            onClick={() => setShowAdmin(true)}
            className="mt-auto py-3 text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-2 border border-dashed border-slate-300 rounded-lg"
          >
            <Settings className="w-3 h-3" />
            ACCESO GESTIÓN
          </button>
        </aside>

        {/* Grid Content */}
        <section className="bg-slate-100 p-4 md:p-8 overflow-y-auto relative">
          <div className="max-w-4xl mx-auto pb-20">
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 md:gap-3">
              {renderNumberGrid()}
            </div>
          </div>

          {/* Floating Selection Bar */}
          <AnimatePresence>
            {selectedNumbers.length > 0 && (
              <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-school-blue text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between z-30 border-2 border-white/20 backdrop-blur-sm"
              >
                <div className="pl-2">
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-0.5">Seleccionados</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black">{selectedNumbers.length}</span>
                    <span className="text-xs font-bold opacity-60">
                      ({selectedNumbers.length * PRICE_PER_NUMBER}€)
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => setSelectedNumbers([])}
                    className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-colors"
                  >
                    <Trash2 className="w-5 h-5 text-white/60" />
                  </button>
                  <button 
                    onClick={() => setShowReservationModal(true)}
                    className="bg-school-yellow text-school-blue font-black px-6 py-3 rounded-2xl shadow-lg hover:bg-white transition-all uppercase tracking-widest text-xs flex items-center gap-2"
                  >
                    Reservar ahora
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* RESERVATION MODAL */}
      <AnimatePresence>
        {showReservationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReservationModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-[20px] shadow-2xl relative z-10 overflow-hidden border border-slate-100"
            >
              <div className="p-8 text-center">
                <button 
                  onClick={() => setShowReservationModal(false)}
                  className="absolute top-4 right-4 text-slate-300 hover:text-slate-500 p-2 transition-colors"
                >
                  <X />
                </button>

                <div className="mb-6">
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {selectedNumbers.sort().map(num => (
                      <div key={num} className="w-10 h-10 bg-school-blue/5 text-school-blue rounded-xl flex items-center justify-center border-2 border-school-blue/10 font-black text-xs">
                        {num}
                      </div>
                    ))}
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-800 uppercase tracking-tight">Finalizar reserva</h2>
                  <p className="text-slate-400 text-sm mt-1">Has seleccionado {selectedNumbers.length} números</p>
                </div>

                <div className="space-y-4 text-left">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tu nombre completo</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                      <input 
                        autoFocus
                        type="text" 
                        value={participantName}
                        onChange={(e) => setParticipantName(e.target.value)}
                        placeholder="Ej: Juan García López"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 text-sm focus:border-school-blue focus:ring-1 focus:ring-school-blue/20 outline-none transition-all"
                      />
                    </div>
                    {errorMessage && <p className="text-rose-500 text-[11px] mt-1.5 font-bold">{errorMessage}</p>}
                  </div>

                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Smartphone className="w-4 h-4 text-school-blue" />
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Pago por Bizum</span>
                    </div>
                    <div className="space-y-2">
                       <p className="text-[11px] text-slate-500 font-medium">
                        Envía <span className="font-bold text-slate-700">{selectedNumbers.length * PRICE_PER_NUMBER}€</span> al:
                      </p>
                      <p className="text-xl font-bold text-school-blue tracking-wider">{bizumPhone}</p>
                      <div className="bg-white border border-slate-100 p-2 rounded flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Concepto</span>
                        <code className="text-[10px] font-bold text-school-blue">
                          SORTEO-{selectedNumbers.slice(0, 3).join('-')}{selectedNumbers.length > 3 ? '...' : ''}
                        </code>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleReserve}
                    className="w-full bg-school-blue hover:bg-blue-800 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-[0.98]"
                  >
                    RESERVAR {selectedNumbers.length > 1 ? `${selectedNumbers.length} NÚMEROS` : 'NÚMERO'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM MODAL */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl relative z-10 overflow-hidden p-8 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">
                {confirmModal.type === 'reset' ? '¿Reiniciar Sorteo?' : '¿Eliminar Reserva?'}
              </h3>
              
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                {confirmModal.type === 'reset' 
                  ? 'Esta acción eliminará TODAS las reservas de forma permanente. No se puede deshacer.' 
                  : `¿Estás seguro de que quieres liberar el número ${confirmModal.number}?`}
              </p>

              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 bg-slate-100 text-slate-500 font-bold py-3 rounded-2xl hover:bg-slate-200 transition-all text-xs uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => confirmModal.type === 'reset' ? handleResetRaffle() : handleDeleteReservation(confirmModal.number!)}
                  className="flex-1 bg-rose-500 text-white font-black py-3 rounded-2xl shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all text-xs uppercase tracking-widest"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADMIN EDIT MODAL */}
      <AnimatePresence>
        {editingReservation && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingReservation(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl relative z-10 overflow-hidden p-8"
            >
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Editar Reserva</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">Número {editingReservation.number}</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nombre del Participante</label>
                  <input 
                    type="text" 
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-4 font-bold text-slate-800 focus:border-school-blue outline-none transition-all"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setEditingReservation(null)}
                    className="flex-1 bg-slate-100 text-slate-500 font-bold py-3 rounded-2xl hover:bg-slate-200 transition-all text-xs uppercase tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleUpdateReservation}
                    className="flex-2 bg-school-blue text-white font-black py-3 rounded-2xl shadow-lg shadow-school-blue/20 hover:bg-blue-800 transition-all text-xs uppercase tracking-widest"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* INFO MODAL */}
      <AnimatePresence>
        {showInfoModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInfoModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-1 bg-school-yellow"></div>
              <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar">
                <button 
                  onClick={() => setShowInfoModal(false)}
                  className="absolute top-6 right-6 text-slate-300 hover:text-school-blue p-2 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="text-center mb-8">
                  <div className="inline-block bg-school-blue/5 p-4 rounded-3xl mb-4">
                    <Trophy className="w-12 h-12 text-school-blue" />
                  </div>
                  <h2 className="text-3xl font-black text-school-blue leading-tight uppercase tracking-tight">
                    SORTEO CHEQUE 50€<br />
                    <span className="text-school-yellow bg-school-blue px-2 py-0.5 rounded-lg inline-block mt-2">MATERIAL ESCOLAR</span>
                  </h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                      <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 bg-school-blue rounded-full"></div>
                        El Premio
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        Sorteamos un cheque por valor de <span className="font-bold text-school-blue text-lg">50€</span> en cada clase.
                      </p>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                      <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 bg-school-blue rounded-full"></div>
                        ¿Cómo se gana?
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Resultará ganadora la persona que compre la terminación que coincida con los <span className="font-bold text-slate-800">2 últimos números</span> del Sorteo de la ONCE del <span className="font-bold text-school-orange">18 de Junio</span>.
                      </p>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                      <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 bg-school-blue rounded-full"></div>
                        Aportación
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Cada terminación supone una aportación de <span className="font-bold text-school-blue">2€</span>.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-school-blue text-white p-6 rounded-3xl shadow-xl">
                      <h3 className="font-black text-white/60 text-[10px] uppercase tracking-widest mb-3">Destino de los fondos</h3>
                      <p className="text-sm leading-relaxed font-bold">
                        Los beneficios de este sorteo se destinarán a la cubierta de la entrada por la puerta de la cancela.
                      </p>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                      <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 bg-school-blue rounded-full"></div>
                        Canjeable en:
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-50 shadow-sm">
                          <div className="w-8 h-8 md:w-10 md:h-10 text-school-blue flex-shrink-0">
                            <Plus className="w-full h-full rotate-45" />
                          </div>
                          <div>
                            <p className="font-bold text-xs text-slate-800 leading-tight">InGenio</p>
                            <p className="text-[10px] text-slate-400 font-medium italic">No sólo papelería</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-50 shadow-sm">
                          <div className="w-8 h-8 md:w-10 md:h-10 text-rose-400 flex-shrink-0">
                            <Plus className="w-full h-full rotate-45" />
                          </div>
                          <div>
                            <p className="font-bold text-xs text-slate-800 leading-tight">Arte y Papel</p>
                            <p className="text-[10px] text-slate-400 font-medium italic">Aquí se dan besos</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-6 bg-rose-50 rounded-3xl border border-rose-100 italic">
                  <p className="text-xs text-rose-500 leading-relaxed font-bold">
                    IMPORTANTE!! SI LA TERMINACIÓN GANADORA NO HA SIDO ADQUIRIDA POR NINGUNA FAMILIA, EL PREMIO QUEDARÁ DESIERTO EN ESA CLASE.
                  </p>
                </div>

                <div className="mt-10 flex flex-col items-center">
                  <p className="text-[10px] font-black uppercase text-slate-300 tracking-[0.2em] mb-4">Organiza:</p>
                  <div className="bg-school-blue text-white px-6 py-3 rounded-full font-black italic tracking-tighter text-sm flex items-center gap-2 shadow-lg scale-110">
                    AMPA CANVIA
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADMIN DRAWER/MODAL */}
      <AnimatePresence>
        {showAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowAdmin(false);
                setIsAdminAuthenticated(false);
                setAdminPinInput("");
                setErrorMessage("");
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              className="bg-white w-full max-w-2xl h-[95vh] rounded-[32px] md:rounded-l-[40px] md:rounded-r-none shadow-2xl relative z-10 overflow-hidden flex flex-col border-l-4 border-school-yellow"
            >
              <div className="p-6 md:p-10 flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-school-blue uppercase tracking-tight">Panel de Control</h2>
                    <p className="text-slate-400 text-sm">Gestión interna del sorteo</p>
                  </div>
                  <button 
                    onClick={() => {
                      setShowAdmin(false);
                      setIsAdminAuthenticated(false);
                      setAdminPinInput("");
                      setErrorMessage("");
                    }}
                    className="bg-slate-50 p-3 rounded-2xl text-slate-400 hover:text-school-blue hover:bg-school-blue/5 transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {!isAdminAuthenticated ? (
                  <div className="flex-1 flex flex-col items-center justify-center max-w-xs mx-auto text-center">
                    <div className="bg-school-yellow/20 p-5 rounded-3xl mb-6">
                      <Settings className="w-10 h-10 text-school-yellow fill-school-yellow/30" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Acceso Administrativo</h3>
                    <p className="text-slate-400 text-xs mb-8 uppercase tracking-widest leading-relaxed">Solo personal autorizado del colegio</p>
                    <input 
                      autoFocus
                      type="password" 
                      maxLength={6}
                      placeholder="••••••"
                      value={adminPinInput}
                      onChange={(e) => setAdminPinInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAdminAuth()}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 text-center text-3xl font-black tracking-[0.5em] focus:border-school-blue focus:outline-none transition-all mb-4"
                    />
                    {errorMessage && <p className="text-rose-500 text-xs mb-4 font-black uppercase tracking-wider">{errorMessage}</p>}
                    <button 
                      onClick={handleAdminAuth}
                      className="w-full bg-school-blue text-white font-black py-4 rounded-2xl hover:bg-blue-800 shadow-lg shadow-school-blue/20 transition-all uppercase tracking-widest text-sm"
                    >
                      Desbloquear
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Admin Actions */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                          <Smartphone className="w-3 h-3" />
                          Teléfono Bizum
                        </label>
                        <input 
                          type="text" 
                          value={bizumPhone}
                          onChange={(e) => setBizumPhone(e.target.value)}
                          className="bg-transparent font-bold text-slate-800 w-full focus:outline-none text-lg"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-2">
                          <button 
                            onClick={exportToCSV}
                            className="bg-school-orange text-white flex items-center justify-center gap-2 py-3 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 text-[10px] uppercase tracking-widest"
                          >
                            <Download className="w-4 h-4" />
                            Exportar
                          </button>
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-school-blue text-white flex items-center justify-center gap-2 py-3 rounded-xl font-bold hover:bg-blue-800 transition-all shadow-lg shadow-school-blue/20 text-[10px] uppercase tracking-widest"
                          >
                            <Upload className="w-4 h-4" />
                            Importar
                          </button>
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleImportCSV} 
                            accept=".csv, text/csv, application/vnd.ms-excel" 
                            className="hidden" 
                          />
                        </div>
                        <button 
                          onClick={() => setConfirmModal({ type: 'reset' })}
                          className="bg-white text-rose-500 border-2 border-rose-100 flex items-center justify-center gap-2 py-3 rounded-xl font-black hover:bg-rose-50 transition-all text-[10px] uppercase tracking-widest"
                        >
                          <Trash2 className="w-4 h-4" />
                          Reiniciar Sorteo
                        </button>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                      <table className="w-full text-left">
                        <thead className="sticky top-0 bg-white border-b-2 border-slate-100 z-10">
                          <tr>
                            <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4">Número</th>
                            <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Participante</th>
                            <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right pr-4">Opciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {Object.values(reservations).length === 0 ? (
                            <tr>
                              <td colSpan={3} className="py-16 text-center text-slate-300 italic text-sm mb-10">Sin datos de participación</td>
                            </tr>
                          ) : (
                            (Object.values(reservations) as Reservation[])
                              .sort((a, b) => parseInt(a.number) - parseInt(b.number))
                              .map((res: Reservation) => (
                                <tr key={res.number} className="group hover:bg-school-blue/5 transition-colors">
                                  <td className="py-4 pl-4">
                                    <span className="inline-block bg-school-blue text-white px-2.5 py-1 rounded-lg font-black text-xs">
                                      {res.number}
                                    </span>
                                  </td>
                                  <td className="py-4">
                                    <p className="font-bold text-slate-800 text-sm uppercase tracking-tight">{res.name}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">{new Date(res.timestamp).toLocaleString()}</p>
                                  </td>
                                  <td className="py-4 text-right pr-4">
                                    <div className="flex justify-end gap-1">
                                      <button 
                                        onClick={() => {
                                          setEditingReservation(res);
                                          setEditedName(res.name);
                                        }}
                                        className="p-2.5 text-slate-300 hover:text-school-blue hover:bg-school-blue/5 rounded-xl transition-all"
                                        title="Editar nombre"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => setConfirmModal({ type: 'delete', number: res.number })}
                                        className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                        title="Eliminar reserva"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #CBD5E1;
        }
      `}</style>
    </div>
  );
}

/**
 * INSTRUCCIONES PARA PUBLICAR EN GITHUB PAGES:
 * 1. Crea un repositorio público en github.com (ej: "sorteo-escolar")
 * 2. Sube todos los archivos (incluyendo la carpeta .github) a la rama main
 * 3. Ve a Settings > Pages en tu repositorio
 * 4. En "Build and deployment" > "Source", selecciona "GitHub Actions"
 * 5. Automáticamente se ejecutará el proceso y en 1-2 minutos estará disponible en: 
 *    https://TU_USUARIO.github.io/sorteo-escolar/
 */

import React from 'react';
import { Receipt, FileText, Ship, Package, DollarSign } from 'lucide-react';

interface Props {
  type: 'proforma' | 'po' | 'booking' | 'invoice';
  operationId: string;
  subtitle?: string;
}

export default function DemoDocumentPreview({ type, operationId, subtitle }: Props) {
  const getHeaderInfo = () => {
    switch (type) {
      case 'proforma': return { title: 'PROFORMA INVOICE', color: 'text-blue-600', bg: 'bg-blue-50', icon: <FileText className="w-8 h-8 text-blue-600" /> };
      case 'po': return { title: 'PURCHASE ORDER', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <Package className="w-8 h-8 text-emerald-600" /> };
      case 'booking': return { title: 'BOOKING INSTRUCTION', color: 'text-purple-600', bg: 'bg-purple-50', icon: <Ship className="w-8 h-8 text-purple-600" /> };
      case 'invoice': return { title: 'COMMERCIAL INVOICE', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: <Receipt className="w-8 h-8 text-indigo-600" /> };
    }
  };

  const info = getHeaderInfo();
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="w-full h-full bg-[#f8fafc] overflow-y-auto rounded-xl p-8 shadow-inner animate-in fade-in duration-300">
      {/* Document Paper */}
      <div className="max-w-4xl mx-auto bg-white min-h-[800px] shadow-sm ring-1 ring-gray-900/5 p-12 relative overflow-hidden">
        {/* Decorative Top Bar */}
        <div className={`absolute top-0 left-0 right-0 h-2 ${info.bg.replace('50', '500')}`}></div>
        
        {/* Header section */}
        <div className="flex justify-between items-start border-b border-gray-100 pb-8 mb-8">
          <div className="flex flex-col">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight" style={{ fontFamily: "'Josefin Sans', sans-serif" }}>
              Global Trading Ltd.
            </h1>
            <p className="text-gray-500 text-sm mt-1">International Trade & Logistics Solutions</p>
            <div className="mt-4 text-xs text-gray-400">
              <p>7500A Beach Road, #12-00</p>
              <p>The Plaza, Singapore 199591</p>
              <p>contact@globaltrading.demo</p>
            </div>
          </div>
          <div className="flex flex-col items-end text-right">
            <div className={`flex items-center gap-3 p-4 rounded-2xl ${info.bg} mb-4`}>
              {info.icon}
              <h2 className={`text-2xl font-black ${info.color} tracking-tight`}>{info.title}</h2>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
              <span className="text-gray-500">Ref Number:</span>
              <span className="font-bold text-gray-900">{type.toUpperCase().substring(0,2)}-{operationId}</span>
              
              <span className="text-gray-500">Date:</span>
              <span className="font-bold text-gray-900">{dateStr}</span>
            </div>
          </div>
        </div>

        {/* Addresses / Context */}
        <div className="grid grid-cols-2 gap-12 mb-10">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-1">Billed To</h3>
            <p className="font-bold text-gray-800 text-lg">{subtitle || 'Gomez Family Market INC'}</p>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              123 Demo Avenue, Suite 400<br/>
              Miami, FL 33101, USA<br/>
              TIN: US-882910023
            </p>
          </div>
          <div>
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-1">Shipping Details</h3>
             <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-gray-500">Port of Loading:</span>
                <span className="font-medium text-gray-800">Montevideo, UY</span>
                <span className="text-gray-500">Port of Discharge:</span>
                <span className="font-medium text-gray-800">Miami, USA</span>
                <span className="text-gray-500">Incoterm:</span>
                <span className="font-medium text-gray-800">CFR</span>
             </div>
          </div>
        </div>

        {/* Dynamic Table based on type */}
        {type !== 'booking' ? (
          <div className="mb-10 rounded-xl overflow-hidden border border-gray-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="py-4 px-6 font-bold">Description</th>
                  <th className="py-4 px-6 font-bold text-center">QTY (MT)</th>
                  <th className="py-4 px-6 font-bold text-right">Unit Price</th>
                  <th className="py-4 px-6 font-bold text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                <tr className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-5 px-6 font-medium text-gray-900">Premium Grade Apples (Fuji)</td>
                  <td className="py-5 px-6 text-center text-gray-600">24.00</td>
                  <td className="py-5 px-6 text-right text-gray-600">$ 1,200.00</td>
                  <td className="py-5 px-6 text-right font-bold text-gray-900">$ 28,800.00</td>
                </tr>
                <tr className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-5 px-6 font-medium text-gray-900">Fresh Oranges (Navel)</td>
                  <td className="py-5 px-6 text-center text-gray-600">12.50</td>
                  <td className="py-5 px-6 text-right text-gray-600">$ 950.00</td>
                  <td className="py-5 px-6 text-right font-bold text-gray-900">$ 11,875.00</td>
                </tr>
              </tbody>
            </table>
            <div className="bg-gray-50 p-6 flex justify-end items-center border-t border-gray-100">
              <div className="flex gap-12 text-right">
                <div className="flex flex-col gap-1">
                   <span className="text-gray-500 text-sm">Subtotal</span>
                   <span className="text-gray-500 text-sm">Freight (Est)</span>
                   <span className="text-gray-900 font-bold text-xl mt-2">TOTAL</span>
                </div>
                <div className="flex flex-col gap-1">
                   <span className="text-gray-800 font-medium text-sm">$ 40,675.00</span>
                   <span className="text-gray-800 font-medium text-sm">$ 3,200.00</span>
                   <span className={`font-black text-xl mt-2 ${info.color}`}>$ 43,875.00</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-10 grid grid-cols-2 gap-6">
             <div className="p-6 bg-purple-50/50 border border-purple-100 rounded-2xl">
                <h4 className="font-bold text-purple-900 mb-4 flex items-center gap-2">
                  <Ship className="w-5 h-5" /> Carrier Information
                </h4>
                <div className="space-y-3 text-sm">
                  <p className="flex justify-between"><span className="text-gray-500">Carrier:</span> <span className="font-medium text-gray-800">Hapag-Lloyd</span></p>
                  <p className="flex justify-between"><span className="text-gray-500">Vessel / Voy:</span> <span className="font-medium text-gray-800">MSC GAYANE 452N</span></p>
                  <p className="flex justify-between"><span className="text-gray-500">ETD:</span> <span className="font-medium text-gray-800">18 Nov 2026</span></p>
                </div>
             </div>
             <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl">
                <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5" /> Container Details
                </h4>
                <div className="space-y-3 text-sm">
                  <p className="flex justify-between"><span className="text-gray-500">Equipment:</span> <span className="font-medium text-gray-800">1 x 40' REEFER HIGH CUBE</span></p>
                  <p className="flex justify-between"><span className="text-gray-500">Temperature:</span> <span className="font-medium text-gray-800">-18.0 DEGREES C</span></p>
                  <p className="flex justify-between"><span className="text-gray-500">Ventilation:</span> <span className="font-medium text-gray-800">CLOSED</span></p>
                </div>
             </div>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-12 pt-8 border-t border-gray-100">
          <p className="text-sm text-gray-500 italic mb-4">
            * This document is automatically generated by the Tess Demo Environment. All data shown is fictitious and for demonstration purposes only.
          </p>
          
          <div className="flex justify-between items-end mt-16">
            <div className="w-48 border-t-2 border-gray-200 pt-2 text-center text-xs font-bold text-gray-400 uppercase">
              Authorized Signature
            </div>
            
            {/* Stamp simulation */}
            <div className="relative w-32 h-32 opacity-20 rotate-[-15deg] mix-blend-multiply flex-shrink-0">
               <div className="absolute inset-0 border-[6px] border-red-500 rounded-full flex items-center justify-center">
                 <div className="text-center">
                   <p className="text-red-500 font-bold text-xs uppercase tracking-widest">Kibans</p>
                   <p className="text-red-500 font-black text-xl leading-none">DEMO</p>
                   <p className="text-red-500 font-bold text-xs">APPROVED</p>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

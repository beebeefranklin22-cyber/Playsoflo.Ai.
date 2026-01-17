import React, { useState, useEffect } from "react";
import { DollarSign, Percent, Calendar, TrendingDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { motion } from "framer-motion";

export default function MortgageCalculator({ property, onClose }) {
  const defaultPrice = property?.sale_price || 500000;
  const [homePrice, setHomePrice] = useState(defaultPrice);
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [interestRate, setInterestRate] = useState(6.5);
  const [loanTerm, setLoanTerm] = useState(30);
  const [propertyTax, setPropertyTax] = useState(1.2);
  const [insurance, setInsurance] = useState(100);
  const [hoa, setHOA] = useState(0);

  const downPayment = (homePrice * downPaymentPercent) / 100;
  const loanAmount = homePrice - downPayment;
  const monthlyRate = interestRate / 100 / 12;
  const numPayments = loanTerm * 12;
  
  const monthlyPrincipalInterest =
    loanAmount *
    (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  const monthlyPropertyTax = (homePrice * (propertyTax / 100)) / 12;
  const monthlyInsurance = insurance;
  const monthlyHOA = hoa;
  
  const totalMonthlyPayment =
    monthlyPrincipalInterest +
    monthlyPropertyTax +
    monthlyInsurance +
    monthlyHOA;

  const totalPaid = totalMonthlyPayment * numPayments;
  const totalInterest = totalPaid - loanAmount - (monthlyPropertyTax + monthlyInsurance + monthlyHOA) * numPayments;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-gradient-to-br from-gray-900 to-gray-950 rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Mortgage Calculator</h2>
            {property && (
              <p className="text-gray-400 text-sm">{property.title}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-6 grid md:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-6">
            <div>
              <label className="text-white font-semibold mb-2 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Home Price
              </label>
              <Input
                type="number"
                value={homePrice}
                onChange={(e) => setHomePrice(Number(e.target.value))}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            <div>
              <label className="text-white font-semibold mb-2 flex items-center gap-2 justify-between">
                <span className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                  Down Payment
                </span>
                <span className="text-emerald-400">{downPaymentPercent}%</span>
              </label>
              <Slider
                value={[downPaymentPercent]}
                onValueChange={(val) => setDownPaymentPercent(val[0])}
                min={0}
                max={50}
                step={1}
                className="mb-2"
              />
              <p className="text-gray-400 text-sm">${downPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>

            <div>
              <label className="text-white font-semibold mb-2 flex items-center gap-2 justify-between">
                <span className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-emerald-400" />
                  Interest Rate
                </span>
                <span className="text-emerald-400">{interestRate}%</span>
              </label>
              <Slider
                value={[interestRate]}
                onValueChange={(val) => setInterestRate(val[0])}
                min={2}
                max={12}
                step={0.1}
              />
            </div>

            <div>
              <label className="text-white font-semibold mb-2 flex items-center gap-2 justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  Loan Term
                </span>
                <span className="text-emerald-400">{loanTerm} years</span>
              </label>
              <Slider
                value={[loanTerm]}
                onValueChange={(val) => setLoanTerm(val[0])}
                min={10}
                max={30}
                step={5}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-white text-sm mb-1 block">Property Tax %</label>
                <Input
                  type="number"
                  value={propertyTax}
                  onChange={(e) => setPropertyTax(Number(e.target.value))}
                  step="0.1"
                  className="bg-white/10 border-white/20 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-white text-sm mb-1 block">Insurance/mo</label>
                <Input
                  type="number"
                  value={insurance}
                  onChange={(e) => setInsurance(Number(e.target.value))}
                  className="bg-white/10 border-white/20 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-white text-sm mb-1 block">HOA/mo</label>
                <Input
                  type="number"
                  value={hoa}
                  onChange={(e) => setHOA(Number(e.target.value))}
                  className="bg-white/10 border-white/20 text-white text-sm"
                />
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-4">
            <div className="p-6 bg-gradient-to-br from-emerald-600 to-green-600 rounded-2xl">
              <p className="text-white/80 text-sm mb-1">Monthly Payment</p>
              <p className="text-4xl font-bold text-white">
                ${totalMonthlyPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-xl">
                <p className="text-gray-400 text-sm mb-1">Principal & Interest</p>
                <p className="text-white font-bold">
                  ${monthlyPrincipalInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl">
                <p className="text-gray-400 text-sm mb-1">Property Tax</p>
                <p className="text-white font-bold">
                  ${monthlyPropertyTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl">
                <p className="text-gray-400 text-sm mb-1">Insurance</p>
                <p className="text-white font-bold">
                  ${monthlyInsurance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl">
                <p className="text-gray-400 text-sm mb-1">HOA</p>
                <p className="text-white font-bold">
                  ${monthlyHOA.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-xl space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Loan Amount</span>
                <span className="text-white font-semibold">
                  ${loanAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Total Interest</span>
                <span className="text-white font-semibold">
                  ${totalInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Total Paid</span>
                <span className="text-white font-semibold">
                  ${totalPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
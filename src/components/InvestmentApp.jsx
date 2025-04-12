import React, { useState, useEffect } from "react";
//import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A28EF5"];

const formatPercent = (value) => `${(value).toFixed(1)}%`;

const InvestmentApp = () => {
  const [fileName, setFileName] = useState("");
  const [data, setData] = useState(null);
  const [improvements, setImprovements] = useState([]);
  const [suggestion, setSuggestion] = useState([]);
  const [rebalance, setRebalance] = useState([]);
  const [assetsToBuy, setAssetsToBuy] = useState({});
  const [assetsTable, setAssetsTable] = useState([]);
  const [assetsTable2, setAssetsTable2] = useState([]);
  const [totalInvested, setTotalInvested] = useState(100000);
  const [extraValue, setExtraValue] = useState(20000);
  const [customTargets, setCustomTargets] = useState({
    "Renda Fixa": 30,
    "Ações BR": 30,
    "FIIs": 10,
    "Ações Internacionais": 20,
    "Cripto": 5,
    "Caixa": 5,
  });
  const [customCount, setCustomCount] = useState({});
  const [rawData, setRawData] = useState([]);

  const handleTargetChange = (category, value) => {
    const newTargets = { ...customTargets, [category]: parseFloat(value) || 0 };
    setCustomTargets(newTargets);
  };

  const handleCountChange = (category, value) => {
    const newCount = { ...customCount, [category]: parseInt(value) || undefined };
    setCustomCount(newCount);
  };

  useEffect(() => {
    if (rawData.length > 0) processData(rawData);
  }, [customTargets, totalInvested, extraValue, customCount]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 });

        const headers = jsonData[0];
        const rows = jsonData.slice(1);
        const mapped = rows.map((row) => {
          return {
            ticket: row[0],
            segmento: row[1] || "",
            percentual: parseFloat(String(row[2]).replace("%", "").replace(",", ".")) || 0,
          };
        });

        setRawData(mapped);
        processData(mapped);
      };
      reader.readAsBinaryString(file);
    }
  };

  const processData = (mapped) => {
    const categories = {
      "Renda Fixa": ["Renda Fixa", "Tesouro", "CDB", "Poupança", "Fixa"],
      "Ações BR": ["Acoes", "Banco", "Energia", "Petróleo", "Previdência", "Saneamento", "Petroquímico", "materiais", "Madeira"],
      "FIIs": ["Fundos-Imobiliarios", "tijolo", "Logistica", "Escritorio", "Recebiveis", "PAPEL", "Indice - Imovel"],
      "Ações Internacionais": ["FIXA - USD", "ETF - USD", "BDR", "STOCK", "TECH", "Farmacia", "Alimentos", "FINTEcH", "Stream"],
      "Cripto": ["Cripto"],
    };

    const totals = {};
    mapped.forEach((item) => {
      let cat = "Outros";
      for (const [key, values] of Object.entries(categories)) {
        if (values.some((v) => String(item.segmento).toLowerCase().includes(v.toLowerCase()))) {
          cat = key;
          break;
        }
      }
      totals[cat] = (totals[cat] || 0) + item.percentual;
    });

    const formattedData = Object.entries(totals).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));
    setData(formattedData);

    const imp = [];
    const sug = Object.keys(customTargets).map((category) => ({
      category,
      target: customTargets[category]
    }));

    formattedData.forEach((item) => {
      const ideal = customTargets[item.name];
      const diff = (item.value - ideal).toFixed(1);
      if (ideal !== undefined && diff !== "0.0") {
        const direcao = item.value > ideal ? "reduzir" : "aumentar";
        const delta = Math.abs(diff);
        imp.push(`${item.name}: atual ${item.value.toFixed(1)}% → alvo ${ideal.toFixed(1)}%. Necessário ${direcao} ${delta.toFixed(1)}%`);
      }
    });

    setImprovements(imp);
    setSuggestion(sug);

    const reb = sug.map((item) => {
      const atual = totals[item.category] || 0;
      const valorAtual = (atual / 100) * totalInvested;
      const valorIdeal = (item.target / 100) * (totalInvested + extraValue);

      const valorIdeal2 = (item.target / 100) * ( extraValue);
      const ajuste = valorIdeal - valorAtual;
      const ajuste2 = valorIdeal2 ;
      return {
        category: item.category,
        valorAtual: valorAtual.toFixed(2),
        valorIdeal: valorIdeal.toFixed(2),
        ajuste: ajuste.toFixed(2),
        ajuste2:ajuste2.toFixed(2),
      };
    });

  

    setRebalance(reb);

    const ativos = {};
    const tabela = [];
    const tabela2 = [];
    reb.forEach((item) => {
      if (parseFloat(item.ajuste) <= 0) return;
      const ativosCat = mapped.filter((i) => {
        return Object.entries(categories).some(([cat, segs]) =>
          cat === item.category && segs.some((v) => String(i.segmento).toLowerCase().includes(v.toLowerCase()))
        );
      });
      const ativosFiltrados = customCount[item.category] ? ativosCat.slice(0, customCount[item.category]) : ativosCat;
      const totalPercentual = ativosFiltrados.reduce((sum, i) => sum + i.percentual, 0);
      ativos[item.category] = ativosFiltrados.map((i) => {
        const proporcao = totalPercentual > 0 ? i.percentual / totalPercentual : 1 / ativosFiltrados.length;
        const valorInvestir = proporcao * parseFloat(item.ajuste);
        tabela.push({ ticket: i.ticket, categoria: item.category, percentual: (proporcao * 100).toFixed(1), valor: valorInvestir.toFixed(2) });
        const valorInvestir2 = proporcao * parseFloat(item.ajuste2);
        tabela2.push({ ticket: i.ticket, categoria: item.category, percentual: (proporcao * 100).toFixed(1), valor: valorInvestir2.toFixed(2) });
        return `${i.ticket} - ${(proporcao * 100).toFixed(1)}% - R$ ${valorInvestir.toFixed(2)}`;
      });
    });

    setAssetsToBuy(ativos);
    setAssetsTable(tabela);
    setAssetsTable2(tabela2);
  };

  return (
    <div className="p-4 grid gap-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-4 text-center">Analisador de Investimentos</h1>

      <Card>
        <CardContent className="p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="font-medium">Upload da Tabela (.csv, .xlsx)</label>
            <Input type="file" accept=".csv, .xlsx" onChange={handleFileUpload} />
            {fileName && <p className="text-sm text-gray-500">Arquivo: {fileName}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-2 items-center">
              <label className="font-medium">Valor atual investido:</label>
              <Input
                type="number"
                className="w-40"
                value={totalInvested}
                onChange={(e) => setTotalInvested(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="flex gap-2 items-center">
              <label className="font-medium">Novo valor a investir:</label>
              <Input
                type="number"
                className="w-40"
                value={extraValue}
                onChange={(e) => setExtraValue(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="mt-4">
            <h3 className="font-semibold mb-2">Alvo por Categoria (%)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(customTargets).map(([category, value], i) => (
                <div key={i} className="flex items-center gap-2">
                  <label className="w-40">{category}</label>
                  <Input
                    type="number"
                    className="w-24"
                    value={value}
                    onChange={(e) => handleTargetChange(category, e.target.value)}
                  />
                  <Input
                    type="number"
                    className="w-24"
                    placeholder="# ativos"
                    onChange={(e) => handleCountChange(category, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {data && (
        <>
          <Card>
            <CardContent className="p-4">
              <h2 className="text-xl font-semibold mb-2">Distribuição Atual</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                  <Legend layout="vertical" verticalAlign="middle" align="right" />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 border-yellow-300">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-yellow-800 font-semibold text-lg">
                ⚠️ Pontos de Melhoria
              </div>
              {improvements.length > 0 ? (
                <ul className="list-disc list-inside text-sm text-gray-700">
                  {improvements.map((imp, index) => (
                    <li key={index}>{imp}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-600">Tudo certo! Sua carteira já está de acordo com os alvos definidos.</p>
              )}
            </CardContent>
          </Card>


          <Card>
            <CardContent className="p-4">
              <h2 className="text-xl font-semibold mb-2">Sugestão de Alocação Ideal</h2>
              <ul className="list-disc list-inside">
                {suggestion.map((item, i) => (
                  <li key={i}>{item.category}: {item.target}%</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h2 className="text-xl font-semibold mb-2">Plano de Rebalanceamento com R$ {extraValue}</h2>
              <ul className="list-disc list-inside">
                {rebalance.map((item, i) => (
                  <li key={i} className={parseFloat(item.ajuste) < 0 ? "text-red-500" : "text-green-600"}>
                    {item.category}: {parseFloat(item.ajuste) > 0 ? "Investir" : "Reduzir"} R$ {Math.abs(item.ajuste)} (Atual: R$ {item.valorAtual}, Ideal: R$ {item.valorIdeal})
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h2 className="text-xl font-semibold mb-2">Ativos a Comprar por Categoria</h2>
            <div className="grid grid-cols-1 gap-2">
                {assetsTable.map((item, idx) => (
                <div key={idx} className="border rounded-xl p-3 shadow-md flex justify-between items-center bg-white">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500">Ativo</span>
                    <span className="font-bold">{item.ticket}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500">Categoria</span>
                    <span>{item.categoria}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500">%</span>
                    <span>{item.percentual}%</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-sm text-gray-500">Valor</span>
                    <span className="text-green-600 font-semibold">R$ {item.valor}</span>
                  </div>
                </div>
              ))}
            </div>

            </CardContent>
          </Card>


          <Card>
            <CardContent className="p-4">
              <h2 className="text-xl font-semibold mb-2">Valor a Investir</h2>
            <div className="grid grid-cols-1 gap-2">
                {assetsTable2.map((item, idx) => (
                <div key={idx} className="border rounded-xl p-3 shadow-md flex justify-between items-center bg-white">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500">Ativo</span>
                    <span className="font-bold">{item.ticket}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500">Categoria</span>
                    <span>{item.categoria}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500">%</span>
                    <span>{item.percentual}%</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-sm text-gray-500">Valor</span>
                    <span className="text-green-600 font-semibold">R$ {item.valor}</span>
                  </div>
                </div>
              ))}
            </div>

            </CardContent>
          </Card>

        </>
      )}
    </div>
  );
};

export default InvestmentApp;

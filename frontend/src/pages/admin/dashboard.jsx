import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card } from "react-bootstrap";
import { 
  FaLaptop, FaUsers, FaUserCheck, FaUserTimes, FaExclamationTriangle, 
  FaQuestionCircle, FaFileAlt, FaCogs 
} from "react-icons/fa";
import { 
  PieChart, Pie, Cell, Tooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, 
  AreaChart, Area 
} from "recharts";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { toast } from "react-toastify";
import "bootstrap/dist/css/bootstrap.min.css";
import "./dashboard.css";

const COLORS = {
  operational: "#59a14f", // green
  notOperational: "#ff9d76", // yellow
  damaged: "#e15759", // red
  missing: "#6c757d", // gray
};

const KPI = ({ title, value, icon, color, bg }) => (
  <Card className="kpi-card shadow-sm" style={{ backgroundColor: bg }}>
    <Card.Body>
      <div className="kpi-icon" style={{ color }}>{icon}</div>
      <h6 className="kpi-title">{title}</h6>
      <div className="kpi-value">{value ?? 0}</div>
    </Card.Body>
  </Card>
);

const ChartCard = ({ title, children }) => (
  <Card className="chart-card shadow-sm">
    <Card.Body>
      <Card.Title className="fw-bold text-center mb-3">{title}</Card.Title>
      {children}
    </Card.Body>
  </Card>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState({});
  const [computerPartStatus, setComputerPartStatus] = useState([]);
  const [labsComputers, setLabsComputers] = useState([]);
  const [damageMissing, setDamageMissing] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/get_data');
        const data = response.data;
        
        const s = data.stats || {};
        setStats(s);

        setComputerPartStatus(Array.isArray(data.computerPartStatus) ? data.computerPartStatus : []);

        setLabsComputers(
          Array.isArray(data.labEquipments)
            ? data.labEquipments.map(lab => ({
                lab: `Computer Lab ${lab.name ?? "Unnamed"}`,
                computers: lab.computers ?? 0
              }))
            : []
        );

        setDamageMissing(
          Array.isArray(data.damageMissing)
            ? data.damageMissing.map(lab => ({
                lab: `Computer Lab ${lab.name ?? "Unnamed"}`,
                damaged: lab.damaged ?? 0,
                missing: lab.missing ?? 0
              }))
            : []
        );
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const summaryItems = [
    { title: "Total Labs", value: stats.totalLabs, icon: <FaLaptop />, color: COLORS.operational, bg: "#eaf2ff" },
    { title: "Total Computers", value: stats.totalComputers, icon: <FaCogs />, color: COLORS.notOperational, bg: "#fffbe6" },
    { title: "Operational Parts", value: stats.operational, icon: <FaUserCheck />, color: COLORS.operational, bg: "#eaf7ef" },
    { title: "Not Operational", value: stats.notOperational, icon: <FaUserTimes />, color: COLORS.notOperational, bg: "#fff7e6" },
    { title: "Total Users", value: stats.totalUsers, icon: <FaUsers />, color: COLORS.operational, bg: "#eaf2ff" },
    { title: "Reports Submitted", value: stats.reportsSubmitted, icon: <FaFileAlt />, color: COLORS.operational, bg: "#f4ecfb" },
    { title: "Damaged Equipments", value: stats.damaged, icon: <FaExclamationTriangle />, color: COLORS.damaged, bg: "#ffe6e6" },
    { title: "Missing Equipments", value: stats.missing, icon: <FaQuestionCircle />, color: COLORS.missing, bg: "#f0f0f0" },
  ];

  if (loading) {
    return (
      <Container fluid className="my-4 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading dashboard data...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="my-4">
      {/* KPIs */}
      <div className="kpi-row mb-4">
        {summaryItems.map((item, idx) => (
          <KPI key={idx} {...item} />
        ))}
      </div>

      <Row className="g-4">
        {/* Computer Status Pie */}
        <Col xs={12} md={6}>
          <ChartCard title="Computer Status">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Operational", value: stats.operational ?? 0 },
                    { name: "Not Operational", value: stats.notOperational ?? 0 },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  label
                >
                  <Cell fill={COLORS.operational} />
                  <Cell fill={COLORS.notOperational} />
                </Pie>
                <Tooltip />
                <Legend layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>

        {/* Computer Parts Status Bar */}
        <Col xs={12} md={6}>
          <ChartCard title="Computer Parts Status">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={computerPartStatus} margin={{ top: 20, right: 20, left: 0, bottom: 20 }} barCategoryGap="30%" barGap={8}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" interval={0} angle={-45} textAnchor="end" />
                <YAxis allowDecimals={false} domain={[0, 'auto']} />
                <Tooltip />
                <Legend verticalAlign="top" align="center" />
                <Bar dataKey="operational" fill={COLORS.operational} barSize={20} />
                <Bar dataKey="notOperational" fill={COLORS.notOperational} barSize={20} />
                <Bar dataKey="missing" fill={COLORS.missing} barSize={20} />
                <Bar dataKey="damaged" fill={COLORS.damaged} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>

        {/* Labs & Computers */}
        <Col xs={12} md={6}>
          <ChartCard title="Labs & Computers">
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={labsComputers} margin={{ top: 30, right: 30, left: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#d6d6d6" />
                <XAxis dataKey="lab" tick={{ fill: "#333", fontSize: 14 }} interval={0} angle={-20} dy={10} />
                <YAxis allowDecimals={false} tick={{ fill: "#333", fontSize: 14 }} />
                <Tooltip cursor={{ fill: "rgba(0,0,0,0.05)" }} contentStyle={{ backgroundColor: "#f9f9f9", border: "1px solid #ccc", borderRadius: "8px", fontSize: 14 }} />
                <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: 14, marginBottom: 10 }} />
                <Bar dataKey="computers" fill={COLORS.operational} barSize={40} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>

        {/* Damage vs Missing */}
        <Col xs={12} md={6}>
          <ChartCard title="Damage vs Missing per Lab">
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={damageMissing} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="damagedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.damaged} stopOpacity={0.9}/>
                    <stop offset="100%" stopColor={COLORS.damaged} stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="missingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.missing} stopOpacity={0.9}/>
                    <stop offset="100%" stopColor={COLORS.missing} stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="lab" interval={0} angle={-30} textAnchor="end" height={60} />
                <YAxis allowDecimals={false}/>
                <Tooltip contentStyle={{ backgroundColor: "#fff", borderRadius: "6px" }}/>
                <Legend verticalAlign="top" align="center"/>
                <Area type="monotone" dataKey="damaged" stroke={COLORS.damaged} fill="url(#damagedGradient)" strokeWidth={2} activeDot={{ r: 6 }}/>
                <Area type="monotone" dataKey="missing" stroke={COLORS.missing} fill="url(#missingGradient)" strokeWidth={2} activeDot={{ r: 6 }}/>
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
      </Row>
    </Container>
  );
}

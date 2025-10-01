import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Clock, Users, Calendar, BookOpen, TrendingDown } from "react-feather";
import Avatar from "@components/avatar";
import { Spinner } from "reactstrap";
import "../../../@core/scss/react/pages/teacher-dashboard.scss"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { fetchTeacherDashboard } from "../../../redux/teacherDashboardSlice";
import MyCourses from "../../apps/mycourses";

// 🔹 Reusable Stat Item
const StatItem = ({ icon, color = "primary", label, value, unit = "" }) => (
  <div className="d-flex align-items-center gap-2 stat-item">
    <Avatar color={`light-${color}`} icon={icon} />
    <div className="stat-text">
      <p className="mb-0 fw-bold">{label}</p>
      <h6 className={`mb-0 text-${color}`}>
        {value}
        {unit && <span className="ms-1">{unit}</span>}
      </h6>
    </div>
  </div>
);

const TeacherDashboard = () => {
  const dispatch = useDispatch();
  const { stats, loading, error } = useSelector(
    (state) => state.teacherDashboard
  );
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchTeacherDashboard());
  }, [dispatch]);

  if (loading)
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "200px" }}>
        <Spinner color="primary" />
      </div>
    );

  if (error) {
    console.log("Dashboard Error:", error);
    return <p className="text-danger">Error: {typeof error === "string" ? error : error.message}</p>;
  }

  if (!stats) return <p>No dashboard data available.</p>;

  return (
    <div className="dashboard-container p-2">
      {/* Welcome */}
      <div className="mb-4">
        <h2 className="fw-bold mb-1 fs-5">
          Welcome, {user?.first_name || user?.username || "Teacher"} 👋🏻
        </h2>
        <p className="text-muted mb-0 fs-6">Keep up the great work on your teaching journey!</p>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-md-4 col-lg-2">
          <StatItem
            icon={<Clock size={18} />}
            color="primary"
            label="Total Hours"
            value={stats?.totalTeachingHours || 0}
            unit="h"
          />
        </div>
        <div className="col-12 col-sm-6 col-md-4 col-lg-2">
          <StatItem
            icon={<Users size={18} />}
            color="info"
            label="Active Students"
            value={stats?.activeStudents || 0}
          />
        </div>
        <div className="col-12 col-sm-6 col-md-4 col-lg-2">
          <StatItem
            icon={<Calendar size={18} />}
            color="success"
            label="Upcoming Classes"
            value={stats?.upcomingClasses || 0}
          />
        </div>
        <div className="col-12 col-sm-6 col-md-4 col-lg-3">
          <StatItem
            icon={<BookOpen size={18} />}
            color="warning"
            label="Next Class"
            value={
              stats?.nextClass
                ? `${stats.nextClass.course} – ${stats.nextClass.date}, ${stats.nextClass.time}`
                : "None"
            }
          />
        </div>
        <div className="col-12 col-sm-6 col-md-4 col-lg-3">
          <StatItem
            icon={<TrendingDown size={18} />}
            color="danger"
            label="Missing Classes"
            value={stats?.missingClasses || 0}
          />
        </div>
      </div>

      {/* Weekly Teaching Trends */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="chart-container card shadow-sm border-0 p-3">
            <h4 className="fw-bold mb-3 fs-6">Weekly Teaching Trends</h4>
            <ResponsiveContainer width="100%" height={window.innerWidth < 576 ? 200 : 280}>
              <LineChart
                data={stats?.weeklyTrends || []}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#495057" }} />
                <YAxis tick={{ fontSize: 12, fill: "#495057" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#f8f9fa",
                    borderRadius: "5px",
                    border: "1px solid #dee2e6",
                  }}
                  formatter={(value) => [`${value}h`, "Hours"]}
                />
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="#7367f0"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {/* My Courses */}
      <div className="row">
        <div className="col-12 my-courses-wrapper">
          <MyCourses />
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;

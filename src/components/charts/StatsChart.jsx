import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

const COLORS = ['#10B981', '#EF4444', '#F59E0B']

const StatsChart = ({ data }) => {
  const chartData = [
    { name: 'Available', value: data.available },
    { name: 'Occupied', value: data.occupied },
    { name: 'Maintenance', value: data.maintenance || 0 },
  ]

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#1E293B', 
            border: 'none', 
            borderRadius: '8px',
            color: '#F1F5F9'
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

export default StatsChart


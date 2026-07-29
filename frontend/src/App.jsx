import LoginPage from '../pages/LoginPage'
import ProfileScreen from '../pages/ProfileScreen'
import UpdateProfile from '../pages/UpdateProfile'
import AddEmployeeRecords from '../pages/AddEmployeeRecords'
import ViewAllEmployees from '../pages/ViewAllEmployees'
import EditEmployee from '../pages/EditEmployee'
import QrCode from '../pages/QrCode'
import DeductionSettings from '../pages/DeductionSettings'
import ViewAttendance from '../pages/ViewAttendance'
import ViewReports from '../pages/ViewReports'
import { BrowserRouter,Routes, Route } from 'react-router-dom'
import './App.css'

function App() {
  

  return (
    <>
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<LoginPage />} />
        <Route path='/profile' element={<ProfileScreen />} />
        <Route path='/updateprofile' element={<UpdateProfile />} />
        <Route path='/addemployee' element={<AddEmployeeRecords />} /> 
        <Route path='/viewemployees' element={<ViewAllEmployees />} /> 
        <Route path='/editemployee/:id' element={<EditEmployee />} />
        <Route path='/deductionsettings' element={<DeductionSettings />} />
        <Route path='/qr' element={<QrCode />} />
        <Route path="/attendance" element={<ViewAttendance />} />
        <Route path="/reports" element={<ViewReports />} />
      </Routes>
    </BrowserRouter>
    </>
  )
}

export default App

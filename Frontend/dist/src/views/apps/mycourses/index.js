import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { fetchMyCourses } from "../../../redux/coursesSlice"
import { Col, Container, Row, Spinner, Alert } from "reactstrap"
import CourseCard from "./CourseCard"
import { useSkin } from '@hooks/useSkin'
import '@styles/react/pages/courses.scss'


const MyCourses = () => {

  const dispatch = useDispatch()
  const { mycourseslist, loading, error } = useSelector((state) => state.courses)
  const { skin } = useSkin()
  // console.log("Skin:", skin)
  useEffect(() => {
    dispatch(fetchMyCourses())
  }, [dispatch])
  // console.log("My Courses:", mycourseslist)
  return (
<Container fluid className="my-courses-container py-2 rounded shadow-sm">
      <h2 className="mb-2 text-center"> MyCourses</h2>

      {loading && (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "transparent  overlay", 
          zIndex: 9999,
        }}
      >
        {/* <Spinner style={{ width: "3rem", height: "3rem" }} color="primary" /> */}
      </div>
    )}

      {error && <Alert color="danger">{error}</Alert>}

      <Row className="g-4">
        {!loading &&
          !error &&
          Array.isArray(mycourseslist) &&
          mycourseslist.map((course) => (
            <Col key={course.id} xs={12} sm={6} lg={4}>
              <CourseCard course={course} />
            </Col>
          ))}
      </Row>
    </Container>
  )
}

export default MyCourses
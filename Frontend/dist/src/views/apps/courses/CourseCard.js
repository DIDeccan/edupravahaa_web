import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import {
  Card,
  CardBody,
  CardTitle,
  CardText,
  CardImg,
  CardFooter,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ListGroup,
  ListGroupItem,
  Badge
} from "reactstrap"
import { FaCheckCircle, FaChartLine, FaClock } from "react-icons/fa"
import toast from "react-hot-toast"
import { enrollCourse, fetchCourses } from "../../../redux/coursesSlice"
import { getTrialPeriod } from "../../../redux/authentication"

const CourseCard = ({ course }) => {
  const [modal, setModal] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [selectedType, setSelectedType] = useState(null)
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const toggle = () => {
    setModal(!modal)
    setSelectedType(null)
    setSelectedSchedule(null)
  }
  const token = useSelector((state) => state.auth.token)
  const razorpay_key = import.meta.env.VITE_RAZORPAY_KEY
  const BaseUrl = import.meta.env.VITE_API_BASE_URL
  const navigate = useNavigate()
  const dispatch = useDispatch()

  // const handleEnroll = async () => {
  //   if (!selectedSchedule) {
  //     toast.error("Please select a schedule before enrolling")
  //     return
  //   }

  //   setEnrolling(true)
  //   try {
  //      const payload = {
  //      course_id: course.id,
  //      batch: selectedSchedule.type,
  //      start_date: selectedSchedule.batchStartDate,
  //      end_date: selectedSchedule.batchEndDate,
  //    }

  //   if (selectedSchedule.type === "weekdays") {
  //      payload.time = selectedSchedule.time
  //    } else if (selectedSchedule.type === "weekends") {
  //      payload.saturday_time = selectedSchedule.saturday_time
  //      payload.sunday_time = selectedSchedule.sunday_time
  //    }
  //    console.log("enroll api", `${BaseUrl}/api/payments/create_order/`, payload)
  //   const orderResponse = await axios.post(
  //      `${BaseUrl}/api/payments/create_order/`,
  //      payload,
  //      { headers: { Authorization: `Bearer ${token}` } }
     
  //     )

  //     const orderData = orderResponse.data.data
  //     console.log("orderData", orderData)
  //     const options = {
  //       key: razorpay_key,
  //       amount: orderData.amount,
  //       currency: orderData.currency,
  //       name: course.name,
  //       description: course.description,
  //       order_id: orderData.order_id,
  //       handler: async function (response) {
  //         console.log("Razorpay response:", response)
  //         try {
  //           const verifyRes = await axios.post(
  //             `${BaseUrl}/api/payments/verify_payment/`,
  //             {
  //               razorpay_order_id: response.razorpay_order_id,
  //               razorpay_payment_id: response.razorpay_payment_id,
  //               razorpay_signature: response.razorpay_signature,
  //               subscription_id: orderData.subscription_id
  //             },
  //             { headers: { Authorization: `Bearer ${token}` } }
  //           )

  //           toast.success("✅ Payment verified successfully!")
  //           dispatch(fetchCourses())
  //           dispatch(getTrialPeriod())
  //           setModal(false)
  //           // navigate("/mycourses", { replace: true }) 
  //         } catch (error) {
  //           console.error("Verification error:", error)
  //           toast.error("❌ Payment verification failed")
  //         }
  //       },
  //       prefill: {
  //         name: "John Doe",
  //         email: "john@example.com",
  //         contact: "9999999999"
  //       },
  //       theme: { color: "#3399cc" }
  //     }

  //     const rzp = new window.Razorpay(options)
  //     rzp.open()
  //   } catch (error) {
  //     console.error("Enrollment error:", error)
  //     toast.error("Something went wrong. Try again.")
  //   } finally {
  //     setEnrolling(false)
  //   }
  // }

  // ✅ Group batches if available


   const handleEnroll = async () => {
    if (!selectedSchedule) {
      toast.error("Please select a schedule before enrolling");
      return;
    }

    setEnrolling(true);
    try {
      await dispatch(
        enrollCourse({ course, selectedSchedule, razorpay_key })
      ).unwrap();

      // ✅ optional: close modal or redirect
      setModal(false);
      dispatch(fetchCourses())
      dispatch(getTrialPeriod())
    } catch (error) {
      console.error("Enroll failed:", error);
      // toast.error handled in thunk
    } finally {
      setEnrolling(false);
    }
  };
const groupedBatches = course.schedule?.reduce((acc, batch) => {
  if (!acc[batch.type]) acc[batch.type] = []
  acc[batch.type].push(batch)
  return acc
}, {}) || {}
const batchTypes = Object.keys(groupedBatches)

const batchList = groupedBatches ? Object.values(groupedBatches) : []

  // Normalize advantages to an array
  const advantagesArray = Array.isArray(course?.advantages)
    ? course.advantages
    : (typeof course?.advantages === 'string'
        ? course.advantages.split(',').map(s => s.trim()).filter(Boolean)
        : [])

      // console.log("courses", course, batchList)
  return (
    <>
      <Card className="shadow-sm h-100 course-card">
        <CardImg
          top
          width="100%"
          height="200px"
          src={
            course.thumbnail ||
            "https://media.istockphoto.com/id/1353769234/photo/training-and-skill-development-concept-with-icons-of-online-course-conference-seminar-webinar.jpg?s=612x612&w=0&k=20&c=2YJG1My6Lu1T1FnzIPbimRNORcSbSuz6A8zb7HKNpx4="
          }
          alt={course.name}
        />
        <CardBody>
          <CardTitle tag="h5" className="fw-bold">
            {course.name}
          </CardTitle>
          <CardText className="course-description text-muted">{course.description}</CardText>
           <div className="course-footer">
              <span className="price">₹{course.base_price}</span>
              {batchList.length === 0 && (
                <span className="coming-soon">Coming Soon ...</span>
              )}
            </div>
        </CardBody>
        <CardFooter className="text-end">
          <Button color="primary" size="sm" onClick={toggle}>
            View Details →
          </Button>
        </CardFooter>
      </Card>

      {/* Modal */}
      <Modal isOpen={modal} toggle={toggle} size="lg" centered>
        <ModalHeader toggle={toggle} className="fw-bold modal-header-custom">
          {course.name}
        </ModalHeader>
        <ModalBody className="course-modal-body">
          <p className="lead">{course.description}</p>

          <h6 className="fw-bold mt-3">Key Advantages:</h6>
          {advantagesArray.length > 0 ? (
            <ListGroup flush>
              {advantagesArray.map((adv, idx) => (
                <ListGroupItem
                  key={idx}
                  className="d-flex align-items-center border-0 px-0"
                >
                  <FaCheckCircle className="text-success me-2" /> {adv}
                </ListGroupItem>
              ))}
            </ListGroup>
          ) : (
            <p className="text-muted mb-0">Details will be updated soon.</p>
          )}

         <h6 className="fw-bold mt-1">Available Batches:</h6>

      {batchTypes.length > 0 ? (
        <>
          {/* Step 1: Choose Type */}
          <div className="d-flex gap-2 flex-wrap mb-2">
            {batchTypes.map((type, idx) => (
              <Button
                key={idx}
                outline
                color={selectedType === type ? "primary" : "secondary"}
                onClick={() => {
                  setSelectedType(type)
                  setSelectedSchedule(null) // reset schedule when switching type
                }}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>

    {/* Step 2: Choose Schedule inside selected type */}
        {selectedType && (
          <div className="d-flex flex-column gap-2">
            {groupedBatches[selectedType].map((batch, idx) => (
              <Card
                key={idx}
                className={`p-2 border ${
                  selectedSchedule === batch ? "border-primary" : ""
                }`}
                onClick={() => setSelectedSchedule(batch)}
                style={{ cursor: "pointer" }}
              >
                <h6 className="fw-bold mb-1">
                  Schedule {idx + 1} ({selectedType})
                </h6>
                {batch.type === "weekdays" ? (
                  <p className="mb-1">
                    <FaClock className="me-2 text-secondary" />
                    {batch.days.join(", ")} → {batch.time}
                  </p>
                ) : (
                  <>
                    <p className="mb-1">
                        <FaClock className="me-2 text-secondary" />
                        Saturday → {batch.saturday_time}
                      </p>
                      <p className="mb-1">
                        <FaClock className="me-2 text-secondary" />
                        Sunday → {batch.sunday_time}
                      </p>
                    </>
                  )}
                <div className="d-flex justify-content-between">
                  <Badge color="info">
                    📅 Starts:{" "}
                    {new Date(batch.batchStartDate).toLocaleDateString("en-US", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </Badge>
                  <Badge color="warning">
                    🏁 Ends:{" "}
                    {new Date(batch.batchEndDate).toLocaleDateString("en-US", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </>
    ) : (
      <p className="text-muted fw-bold">Coming Soon</p>
    )}


          {/* ✅ Show selected batch details
          {selectedBatch && (
            <div className="mt-1 p-1 border rounded">
              <h6 className="fw-bold">Schedule Details:</h6>
              <div>
                {selectedBatch.sessions.map((s, i) => (
                  <p key={i} className="mb-1">
                    <FaClock className="me-2 text-secondary" />
                    {s.day}: {s.time}
                  </p>
                ))}
              </div>
              <div className="d-flex justify-content-between align-items-center mt-2">
                <Badge color="info" className="px-1 py-1">
                  📅 Starts:{" "}
                  {new Date(selectedBatch.startDate).toLocaleDateString("en-US", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </Badge>
                <Badge color="warning" className="px-1 py-1">
                  🏁 Ends:{" "}
                  {new Date(selectedBatch.endDate).toLocaleDateString("en-US", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </Badge>
              </div>
            </div>
          )} */}


          <div className="mt-1 d-flex justify-content-between">
            <span>
              <FaClock className="me-2 text-secondary" />
              Duration: {course.duration_hours} hrs
            </span>
            <span>
              <FaChartLine className="me-2 text-primary" />
              Price: ₹{course.base_price}
            </span>
          </div>
        </ModalBody>
        <ModalFooter className="d-flex justify-content-between">
          <Button color="secondary" onClick={toggle}>
            Close
          </Button>
          <Button 
            color="primary" 
            onClick={handleEnroll} 
            disabled={!selectedSchedule || enrolling} 
          >
            {enrolling ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" />
                Processing...
              </>
            ) : (
              'Enroll Now'
            )}
          </Button>

        </ModalFooter>
      </Modal>
    </>
  )
}

export default CourseCard

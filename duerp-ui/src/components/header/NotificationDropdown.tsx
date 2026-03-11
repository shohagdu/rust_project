import { useEffect, useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Link } from "react-router";
import api from '../../api';


export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifying, setNotifying] = useState(true);
  const [subItems, setSubItems] = useState<any[]>([]); // Add state for subItems

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleClick = () => {
    toggleDropdown();
    setNotifying(false);
  };

  useEffect(() => {
    fetchCourseOperations();
  }, []);

  const fetchCourseOperations = async () => {
    try {
      const empId = JSON.parse(
          localStorage.getItem("user_data") || "{}"
      )?.emp_id;

      const response = await api.post(
          "/api/course/course-operation-by-faculty",
          { faculty_id: empId }
      );



      const courseItems = response.data.map((item: any) => ({
        name: item.course_code
            ? `${item.course_code} : ${item.course_title}`
            : item.course_title,
        program_name: item.program_name
            ? `${item.program_name} : ${item.department_name}` : item.department_name,

        path: `/show-course-operation/${item.id}`,
      }));



      const items = [...courseItems];
      setSubItems(items); // Set the subItems state
    } catch (error) {
      console.error("Failed to load course operations", error);
    }
  };

  return (
      <div className="relative">
        <button
            className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full dropdown-toggle hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            onClick={handleClick}
        >
          <img src="https://www.nicepng.com/png/detail/10-101646_borrow-library-books-book-stack-books-icon.png"
               alt="Borrow Library Books - Book Stack Books Icon@nicepng.com"/>

        </button>
        <Dropdown
            isOpen={isOpen}
            onClose={closeDropdown}
            className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
            <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              List of Courses
            </h5>
            <button
                onClick={toggleDropdown}
                className="text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <svg
                  className="fill-current"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
              >
                <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                    fill="currentColor"
                />
              </svg>
            </button>
          </div>
          <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
            {subItems.map((item, index) => (
                <li key={index}>
                  <Link to={item.path}>
                    <div
                        onClick={toggleDropdown}
                        className="flex gap-3 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5"
                    >
                  <span className="block w-full">
                    <span className="mb-1.5 block text-theme-sm font-medium text-gray-800 dark:text-white/90">
                      {item.name}
                    </span>
                    <span className="text-gray-500 text-theme-xs dark:text-gray-400">
                      {item.program_name}
                    </span>
                  </span>
                    </div>
                  </Link>
                </li>
            ))}
          </ul>
          {/*<Link*/}
          {/*    to="/"*/}
          {/*    className="block px-4 py-2 mt-3 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"*/}
          {/*>*/}
          {/*  View All Notifications*/}
          {/*</Link>*/}
        </Dropdown>
      </div>
  );
}
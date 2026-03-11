import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";

import {
  ChevronDownIcon,
  DocsIcon,
  FolderIcon,
  GridIcon,
  HorizontaLDots,
  PageIcon,
  PieChartIcon,
  TaskIcon,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";
// import api from "../api";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const othersItems: NavItem[] = [
  {
    icon: <PieChartIcon />,
    name: "Charts",
    subItems: [
      { name: "Line Chart", path: "/line-chart", pro: false },
      { name: "Bar Chart", path: "/bar-chart", pro: false },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  // Extract courseId from URL
  const match = location.pathname.match(
    /^\/(?:show-course-operation|manage-course-students|manage-class-list|take-attendance|edit-attendance|attendance-sheet|manage-class|create-class-operation|assignment|quiz-assignment|materials|material)\/([^/]+)/
  );
  // http://localhost:5173/manage-course-students/1237b6c9-0523-4ade-8b17-1866b6804e66
  // http://localhost:5173/manage-course-students/1237b6c9-0523-4ade-8b17-1866b6804e66

  const courseId = match ? match[1] : undefined;

  // Build navigation items dynamically based on courseId
  const navItems: NavItem[] = [
    ...(courseId
      ? [
        {
          icon: <GridIcon />,
          name: "Course Dashboard",
          path: `/show-course-operation/${courseId}`,
        },

        {
          icon: <GridIcon />,
          name: "Students Management",
          path: `/manage-course-students/${courseId}`,
        }, {
          icon: <GridIcon />,
          name: "Take Attendance",
          path: `/take-attendance/${courseId}`,
        },
        {
          icon: <GridIcon />,
          name: "Previous Attendances",
          path: `/manage-class-list/${courseId}`,
        },
        {
          icon: <GridIcon />,
          name: "Uploaded Materials",
          path: `/materials/${courseId}`,
        },
        {
          icon: <TaskIcon />,
          name: "Assignment",
          path: `/assignment/${courseId}`,
        },
      ]
      : [{
        icon: <GridIcon />,
        name: "Dashboard",
        path: "/dashboard",
      },
      {
        icon: <GridIcon />,
        name: "Create New Operation",
        path: "/create-class-operation",
      }]),
  ];

  // useEffect(() => {
  //   fetchCourseOperations();
  // }, []);

  // const fetchCourseOperations = async () => {
  //   try {
  //     const empId = JSON.parse(
  //         localStorage.getItem("user_data") || "{}"
  //     )?.emp_id;
  //
  //     const response = await api.post(
  //         "/api/course/course-operation-by-faculty",
  //         { faculty_id: empId }
  //     );
  //
  //
  //     const beforeItem = {
  //       name: "Attendance",
  //       path: "/take-attendance/a87856ca-f69f-4698-b0fb-364caa71b8a4",
  //     };
  //
  //     const courseItems = response.data.map((item: any) => ({
  //       name: item.course_code
  //           ? `${item.course_code} : ${item.course_title}`
  //           : item.course_title,
  //       path: `/show-course-operation/${item.id}`,
  //     }));
  //
  //     const afterItem = {
  //       name: "Create Course",
  //       path: "/create-class-operation",
  //     };
  //
  //     const subItems = [beforeItem, ...courseItems, afterItem];
  //
  //     setNavItems((prev) =>
  //         prev.map((nav) =>
  //             nav.name === "Course Operation" ? { ...nav, subItems } : nav
  //         )
  //     );
  //   } catch (error) {
  //     console.error("Failed to load course operations", error);
  //   }
  // };

  // Update this useEffect to run when navItems changes as well
  useEffect(() => {
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? navItems : othersItems;
      items.forEach((nav, index) => {
        if (nav.subItems && nav.subItems.length > 0) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main" | "others",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    // Also check if we're on any show-course-operation route
    if (!submenuMatched && location.pathname.startsWith("/show-course-operation")) {
      // Find the Course Operation menu item index
      const courseOpIndex = navItems.findIndex((nav) => nav.name === "Course Operation");
      if (courseOpIndex !== -1) {
        setOpenSubmenu({
          type: "main",
          index: courseOpIndex,
        });
        submenuMatched = true;
      }
    }

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive, navItems]); // Added navItems dependency

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu, navItems]); // Added navItems dependency to recalculate height

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${openSubmenu?.type === menuType && openSubmenu?.index === index
                ? "menu-item-active"
                : "menu-item-inactive"
                } cursor-pointer ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
                }`}
            >
              <span
                className={`menu-item-icon-size  ${openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-icon-active"
                  : "menu-item-icon-inactive"
                  }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                    ? "rotate-180 text-brand-500"
                    : ""
                    }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                  }`}
              >
                <span
                  className={`menu-item-icon-size ${isActive(nav.path)
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                    }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && nav.subItems.length > 0 && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      to={subItem.path}
                      className={`menu-dropdown-item ${isActive(subItem.path)
                        ? "menu-dropdown-item-active"
                        : "menu-dropdown-item-inactive"
                        }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
                              ? "menu-dropdown-badge-active"
                              : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge`}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
                              ? "menu-dropdown-badge-active"
                              : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge`}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-gradient-to-b from-[#0f172a] via-[#1e1b4b] to-[#0f172a] text-white h-screen transition-all duration-300 ease-in-out z-50 border-r border-white/10
        ${isExpanded || isMobileOpen
          ? "w-[290px]"
          : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
          }`}
      >
        <Link to="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              {/* Always use the dark/white logo against the dark gradient */}
              <img
                className=""
                src="/images/logo/dulogo.png"
                alt="Logo"
                width={150}
                height={40}
              />
            </>
          ) : (
            <img
              src="/images/logo/dulogo.png"
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "justify-start"
                  }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
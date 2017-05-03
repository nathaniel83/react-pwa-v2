import About from "../app/components/about";
import { updateRoutes } from "../client";

const routes = [
  {
    path: "/about",
    component: About,
    bundleKey: "about",
    seo: {
      title: "About Page",
      description: "This is all of the description more than 200 characters",
      keywords: "some,awesome,keywords",
      image: "https://www.atyantik.com/wp-content/uploads/2016/10/Stress.jpg",
      site_name: "Site Name",
      type: "article", // article/product
      type_details: {
        price: {
          currency: "USD",
          amount: "15",
          currency_symbol: "$",
        },
        color: "black",
        section: "Lifestyle", // Lifestyle/sports/news
        site_name: "Site name",
        published_time: "2013-09-17T05:59:00+01:00",
        modified_time: "2013-09-17T05:59:00+01:00",
      },
      meta: [
        {
          name: "tirth",
          content: "bodawala"
        },
      ],
    }
  }
];

updateRoutes(routes);

export default routes;
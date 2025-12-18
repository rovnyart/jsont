import { faker } from "@faker-js/faker";

export type RootType = "object" | "array";
export type DataSize = "small" | "medium" | "large";

export interface RandomJsonOptions {
  rootType: RootType;
  size: DataSize;
}

export const defaultRandomJsonOptions: RandomJsonOptions = {
  rootType: "object",
  size: "medium",
};

// Size configurations
const sizeConfig: Record<
  DataSize,
  { arrayLength: number; objectKeys: number; nestedDepth: number }
> = {
  small: { arrayLength: 5, objectKeys: 4, nestedDepth: 1 },
  medium: { arrayLength: 50, objectKeys: 6, nestedDepth: 2 },
  large: { arrayLength: 1000, objectKeys: 8, nestedDepth: 3 },
};

// Generate a random person object
function generatePerson() {
  return {
    id: faker.string.uuid(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
    avatar: faker.image.avatar(),
    birthDate: faker.date.birthdate().toISOString().split("T")[0],
    address: {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      country: faker.location.country(),
      zipCode: faker.location.zipCode(),
    },
    company: {
      name: faker.company.name(),
      department: faker.commerce.department(),
      jobTitle: faker.person.jobTitle(),
    },
  };
}

// Generate a random product object
function generateProduct() {
  return {
    id: faker.string.uuid(),
    name: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    price: parseFloat(faker.commerce.price()),
    currency: "USD",
    category: faker.commerce.department(),
    inStock: faker.datatype.boolean(),
    stock: faker.number.int({ min: 0, max: 500 }),
    rating: parseFloat(faker.number.float({ min: 1, max: 5 }).toFixed(1)),
    reviews: faker.number.int({ min: 0, max: 1000 }),
    image: faker.image.url(),
    tags: Array.from({ length: faker.number.int({ min: 1, max: 4 }) }, () =>
      faker.commerce.productAdjective()
    ),
  };
}

// Generate a random post/article object
function generatePost() {
  return {
    id: faker.string.uuid(),
    title: faker.lorem.sentence(),
    slug: faker.lorem.slug(),
    excerpt: faker.lorem.paragraph(),
    content: faker.lorem.paragraphs(3),
    author: {
      name: faker.person.fullName(),
      username: faker.internet.username(),
      avatar: faker.image.avatar(),
    },
    publishedAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    tags: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () =>
      faker.word.noun()
    ),
    likes: faker.number.int({ min: 0, max: 10000 }),
    comments: faker.number.int({ min: 0, max: 500 }),
    featured: faker.datatype.boolean(),
  };
}

// Generate a random event object
function generateEvent() {
  const startDate = faker.date.future();
  const endDate = new Date(
    startDate.getTime() + faker.number.int({ min: 1, max: 8 }) * 60 * 60 * 1000
  );

  return {
    id: faker.string.uuid(),
    title: faker.lorem.sentence({ min: 3, max: 6 }),
    description: faker.lorem.paragraph(),
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    location: {
      venue: faker.company.name(),
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      country: faker.location.country(),
    },
    organizer: faker.person.fullName(),
    attendees: faker.number.int({ min: 10, max: 500 }),
    isOnline: faker.datatype.boolean(),
    price: faker.datatype.boolean()
      ? parseFloat(faker.commerce.price({ min: 10, max: 200 }))
      : 0,
    categories: Array.from(
      { length: faker.number.int({ min: 1, max: 3 }) },
      () => faker.word.noun()
    ),
  };
}

// Generate a complex nested object for larger sizes
function generateCompanyData(depth: number): Record<string, unknown> {
  const base: Record<string, unknown> = {
    id: faker.string.uuid(),
    name: faker.company.name(),
    industry: faker.company.buzzNoun(),
    founded: faker.date.past({ years: 50 }).getFullYear(),
    website: faker.internet.url(),
    employees: faker.number.int({ min: 10, max: 10000 }),
    revenue: `$${faker.number
      .int({ min: 100000, max: 10000000000 })
      .toLocaleString()}`,
    headquarters: {
      city: faker.location.city(),
      country: faker.location.country(),
      timezone: faker.location.timeZone(),
    },
    contact: {
      email: faker.internet.email(),
      phone: faker.phone.number(),
    },
  };

  if (depth > 1) {
    base.departments = Array.from(
      { length: faker.number.int({ min: 2, max: 4 }) },
      () => ({
        name: faker.commerce.department(),
        head: faker.person.fullName(),
        budget: parseFloat(faker.commerce.price({ min: 50000, max: 1000000 })),
        employeeCount: faker.number.int({ min: 5, max: 100 }),
      })
    );
  }

  if (depth > 2) {
    base.financials = {
      quarterlyRevenue: Array.from({ length: 4 }, (_, i) => ({
        quarter: `Q${i + 1}`,
        revenue: faker.number.int({ min: 1000000, max: 50000000 }),
        expenses: faker.number.int({ min: 500000, max: 30000000 }),
        profit: faker.number.int({ min: 100000, max: 20000000 }),
      })),
      stockPrice: parseFloat(faker.commerce.price({ min: 10, max: 500 })),
      marketCap: `$${faker.number
        .int({ min: 1000000000, max: 100000000000 })
        .toLocaleString()}`,
    };
    base.partners = Array.from(
      { length: faker.number.int({ min: 2, max: 5 }) },
      () => ({
        name: faker.company.name(),
        type: faker.helpers.arrayElement([
          "technology",
          "distribution",
          "marketing",
          "financial",
        ]),
        since: faker.date.past({ years: 10 }).getFullYear(),
      })
    );
  }

  return base;
}

// Main generator functions based on size
function generateSmallObject(): Record<string, unknown> {
  const templates = [
    generatePerson,
    generateProduct,
    generatePost,
    generateEvent,
  ];
  const generator = faker.helpers.arrayElement(templates);
  return generator();
}

function generateMediumObject(): Record<string, unknown> {
  return generateCompanyData(2);
}

function generateLargeObject(): Record<string, unknown> {
  return generateCompanyData(3);
}

function generateSmallArray(): unknown[] {
  const config = sizeConfig.small;
  const templates = [
    generatePerson,
    generateProduct,
    generatePost,
    generateEvent,
  ];
  const generator = faker.helpers.arrayElement(templates);
  return Array.from({ length: config.arrayLength }, () => generator());
}

function generateMediumArray(): unknown[] {
  const config = sizeConfig.medium;
  const templates = [
    generatePerson,
    generateProduct,
    generatePost,
    generateEvent,
  ];
  const generator = faker.helpers.arrayElement(templates);
  return Array.from({ length: config.arrayLength }, () => generator());
}

function generateLargeArray(): unknown[] {
  const config = sizeConfig.large;
  const templates = [
    generatePerson,
    generateProduct,
    generatePost,
    generateEvent,
  ];
  const generator = faker.helpers.arrayElement(templates);
  return Array.from({ length: config.arrayLength }, () => generator());
}

export function generateRandomJson(
  options: RandomJsonOptions = defaultRandomJsonOptions
): unknown {
  const { rootType, size } = options;

  if (rootType === "array") {
    switch (size) {
      case "small":
        return generateSmallArray();
      case "medium":
        return generateMediumArray();
      case "large":
        return generateLargeArray();
    }
  } else {
    switch (size) {
      case "small":
        return generateSmallObject();
      case "medium":
        return generateMediumObject();
      case "large":
        return generateLargeObject();
    }
  }
}

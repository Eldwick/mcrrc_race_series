/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  // Make distance_miles nullable to handle cases where race distance cannot be parsed
  pgm.alterColumn('races', 'distance_miles', {
    allowNull: true,
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  // Make distance_miles NOT NULL again (this will fail if there are NULL values)
  pgm.alterColumn('races', 'distance_miles', {
    allowNull: false,
  });
};

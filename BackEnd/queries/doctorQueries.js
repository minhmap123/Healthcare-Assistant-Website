import pool from "../config/connection.js";

export async function listDoctorsQuery() {
  const sql = `
    SELECT 
      d.doctor_id,
      d.user_id,
      u.full_name    AS name,
      u.profile_picture_url AS avatar,
      d.specialty,
      d.hospital
    FROM doctors d
    JOIN users   u ON u.user_id = d.user_id
    ORDER BY d.specialty, u.full_name
  `;
  const [rows] = await pool.execute(sql);
  return rows;
}

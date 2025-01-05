import { motion } from 'framer-motion';
import { User } from 'next-auth';

export const Overview = ({ user }: { user: User | null | undefined }) => {
  console.log(user);

  return (
    <motion.div
      key="overview"
      className="max-w-3xl mx-auto md:mt-20"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="rounded-xl p-6 flex flex-col gap-8 leading-relaxed text-center max-w-xl">

        <p>
          Bragdoc.ai helps you document your work achievements effortlessly, then writes documents
          for your boss whenever you need them.
        </p>

        <p>
          A brag document is your secret weapon for career growth.
        </p>
      </div>
    </motion.div>
  );
};
